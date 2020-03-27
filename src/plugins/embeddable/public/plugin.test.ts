/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { coreMock } from '../../../core/public/mocks';
import { testPlugin } from './tests/test_plugin';
import { EmbeddableFactoryProvider } from './types';
import { defaultEmbeddableFactoryProvider } from './lib';

test('cannot register embeddable factory with the same ID', async () => {
  const coreSetup = coreMock.createSetup();
  const coreStart = coreMock.createStart();
  const { setup } = testPlugin(coreSetup, coreStart);
  const embeddableFactoryId = 'ID';
  const embeddableFactory = {} as any;

  setup.registerEmbeddableFactory(embeddableFactoryId, embeddableFactory);
  expect(() =>
    setup.registerEmbeddableFactory(embeddableFactoryId, embeddableFactory)
  ).toThrowError(
    'Embeddable factory [embeddableFactoryId = ID] already registered in Embeddables API.'
  );
});

test('can set custom embeddable factory provider', async () => {
  const coreSetup = coreMock.createSetup();
  const coreStart = coreMock.createStart();
  const { setup, doStart } = testPlugin(coreSetup, coreStart);

  const customProvider: EmbeddableFactoryProvider = def => ({
    ...defaultEmbeddableFactoryProvider(def),
    getDisplayName: () => 'Intercepted!',
  });

  setup.setEmbeddableFactoryProvider(customProvider);
  setup.registerEmbeddableFactory('test', {
    type: 'test',
    create: () => Promise.resolve(undefined),
    getDisplayName: () => 'Test',
    isEditable: () => Promise.resolve(true),
  });

  const start = doStart();
  const factory = start.getEmbeddableFactory('test');
  expect(factory!.getDisplayName()).toEqual('Intercepted!');
});
