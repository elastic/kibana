/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Throwaway probe: drives the real CoreInjectionService to observe how `Global`
 * services cross plugin containers. Run: node examples/di_soft_dependency_spike/probe/run.js
 */

import { ContainerModule } from 'inversify';
import { createToken, KibanaContainerModule, OnStart, Setup, Start } from '@kbn/core-di';
import { CoreInjectionService, Global } from '@kbn/core-di-internal';

interface Greeter {
  greet(): string;
}
const GreeterToken = createToken<Greeter>('spike.probe.Greeter');
const ExtensionToken = createToken<{ id: string }>('spike.probe.Extension');

const show = (label: string, fn: () => unknown) => {
  try {
    console.log(`${label.padEnd(70)} =>`, JSON.stringify(fn()));
  } catch (e) {
    console.log(`${label.padEnd(70)} => THROWS ${(e as Error).message.split('\n')[0]}`);
  }
};

const service = new CoreInjectionService();
const { getContainer } = service.setup();

const providerModule = new ContainerModule(({ bind }) => {
  bind(GreeterToken).toConstantValue({ greet: () => 'hello from provider' });
  bind(Global).toConstantValue(GreeterToken);
});

const consumerModule = (id: string) =>
  new ContainerModule(({ bind }) => {
    bind(ExtensionToken).toConstantValue({ id });
    bind(Global).toConstantValue(ExtensionToken);
  });

const collected: string[] = [];
const registryOwnerModule = new KibanaContainerModule(({ onStart }) => {
  onStart(ExtensionToken, (_ctx, ext) => collected.push(`helper:${ext.id}`));
});

const consumer = getContainer(Symbol('consumer'));
const provider = getContainer(Symbol('provider'));
const otherConsumer = getContainer(Symbol('otherConsumer'));
const registryOwner = getContainer(Symbol('registryOwner'));
const absent = getContainer(Symbol('absentProvider'));

consumer.load(consumerModule('consumer'));
otherConsumer.load(consumerModule('otherConsumer'));
registryOwner.load(registryOwnerModule);

console.log('\n--- 1. provider module loaded? no. consumer asks for GreeterToken');
show('consumer.get(Greeter)', () => consumer.get(GreeterToken).greet());
show('consumer.get(Greeter, {optional})', () => consumer.get(GreeterToken, { optional: true }));
show('consumer.isBound(Greeter)', () => consumer.isBound(GreeterToken));
show('absent.getAll(Extension, {optional})', () =>
  absent.getAll(ExtensionToken, { optional: true })
);

console.log('\n--- 2. provider module loaded but provider Setup not activated yet');
provider.load(providerModule);
show('consumer.get(Greeter, {optional})', () => consumer.get(GreeterToken, { optional: true }));

console.log('\n--- 3. provider Setup activated (what PluginWrapper.setup does)');
provider.get(Setup, { optional: true });
show('consumer.get(Greeter).greet()', () => consumer.get(GreeterToken).greet());
show('consumer.isBound(Greeter)', () => consumer.isBound(GreeterToken));
show('consumer.isCurrentBound(Greeter)', () => consumer.isCurrentBound(GreeterToken));

console.log('\n--- 4. registry: consumers publish ExtensionToken; registry owner collects');
show('registryOwner.getAll(Extension) before consumer Setup', () =>
  registryOwner.getAll(ExtensionToken, { optional: true }).map((e) => e.id)
);
consumer.get(Setup, { optional: true });
show('registryOwner.getAll(Extension) after 1 consumer Setup', () =>
  registryOwner.getAll(ExtensionToken, { optional: true }).map((e) => e.id)
);
otherConsumer.get(Setup, { optional: true });
show('registryOwner.getAll(Extension) after 2 consumer Setups', () =>
  registryOwner.getAll(ExtensionToken, { optional: true }).map((e) => e.id)
);
show('registryOwner.isCurrentBound(Extension)', () => registryOwner.isCurrentBound(ExtensionToken));

console.log('\n--- 5. KibanaContainerModule onStart(ExtensionToken) helper in registry owner');
registryOwner.get(Setup, { optional: true });
registryOwner.get(Start, { optional: true });
show('collected by helper', () => collected);
show(
  'OnStart hooks in registry owner',
  () => registryOwner.getAll(OnStart, { optional: true }).length
);

console.log('\n--- 6. two plugins publish the same Option A token');
const secondProvider = getContainer(Symbol('secondProvider'));
secondProvider.load(
  new ContainerModule(({ bind }) => {
    bind(GreeterToken).toConstantValue({ greet: () => 'hello from second provider' });
    bind(Global).toConstantValue(GreeterToken);
  })
);
secondProvider.get(Setup, { optional: true });
show('consumer.get(Greeter)', () => consumer.get(GreeterToken).greet());
show('consumer.getAll(Greeter)', () => consumer.getAll(GreeterToken).map((g) => g.greet()));

console.log('\n--- 7. one plugin contributes two Option B extensions');
const multiContributor = getContainer(Symbol('multiContributor'));
multiContributor.load(
  new ContainerModule(({ bind }) => {
    bind(ExtensionToken).toConstantValue({ id: 'multi-1' });
    bind(ExtensionToken).toConstantValue({ id: 'multi-2' });
    bind(Global).toConstantValue(ExtensionToken);
    bind(Global).toConstantValue(ExtensionToken);
  })
);
multiContributor.get(Setup, { optional: true });
show('registryOwner.getAll(Extension)', () =>
  registryOwner.getAll(ExtensionToken, { optional: true }).map((e) => e.id)
);

console.log('\n--- 8. one plugin binds two extensions but marks the token Global only once');
const sloppyContributor = getContainer(Symbol('sloppyContributor'));
sloppyContributor.load(
  new ContainerModule(({ bind }) => {
    bind(ExtensionToken).toConstantValue({ id: 'sloppy-1' });
    bind(ExtensionToken).toConstantValue({ id: 'sloppy-2' });
    bind(Global).toConstantValue(ExtensionToken);
  })
);
sloppyContributor.get(Setup, { optional: true });
show('registryOwner.getAll(Extension)', () =>
  registryOwner.getAll(ExtensionToken, { optional: true }).map((e) => e.id)
);
