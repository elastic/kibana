/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { extractArgIdentifiers, extractTokenMetadataFromSource, mergeGlobals } from './di_globals';

describe('extractTokenMetadataFromSource', () => {
  it('extracts tokens from direct imports bound to a local factory variable', () => {
    const source = `
      import { createTokenFactory } from '@kbn/plugin-di';

      const sloTokens = createTokenFactory('slo');

      export const SloCreateFlyoutToken =
        sloTokens.service<CreateFlyout>('CreateFlyout');
      export const SloFactoriesToken =
        sloTokens.extensionPoint<FactoryRegistration>('FactoryRegistration');
    `;

    expect(extractTokenMetadataFromSource(source)).toEqual([
      {
        exportName: 'SloCreateFlyoutToken',
        kind: 'service',
        name: 'slo.CreateFlyout',
      },
      {
        exportName: 'SloFactoriesToken',
        kind: 'extensionPoint',
        name: 'slo.FactoryRegistration',
      },
    ]);
  });

  it('extracts tokens from aliased and inline createTokenFactory calls', () => {
    const source = `
      import { createTokenFactory as defineTokenFactory } from '@kbn/plugin-di';

      export const SloCreateFlyoutToken =
        defineTokenFactory('slo').service<CreateFlyout>('CreateFlyout');
      export const SloFactoriesToken =
        defineTokenFactory('slo').extensionPoint<FactoryRegistration>('FactoryRegistration');
    `;

    expect(extractTokenMetadataFromSource(source)).toEqual([
      {
        exportName: 'SloCreateFlyoutToken',
        kind: 'service',
        name: 'slo.CreateFlyout',
      },
      {
        exportName: 'SloFactoriesToken',
        kind: 'extensionPoint',
        name: 'slo.FactoryRegistration',
      },
    ]);
  });

  it('extracts tokens from namespace imports and inline namespace calls', () => {
    const source = `
      import * as tokenFactoryNs from '@kbn/plugin-di';

      const embeddableTokens = tokenFactoryNs.createTokenFactory('embeddable');

      export const EmbeddableFactoryRegistrationToken =
        embeddableTokens.extensionPoint<FactoryRegistration>('FactoryRegistration');
      export const EmbeddableRendererToken =
        tokenFactoryNs.createTokenFactory('embeddable').service<Renderer>('Renderer');
    `;

    expect(extractTokenMetadataFromSource(source)).toEqual([
      {
        exportName: 'EmbeddableFactoryRegistrationToken',
        kind: 'extensionPoint',
        name: 'embeddable.FactoryRegistration',
      },
      {
        exportName: 'EmbeddableRendererToken',
        kind: 'service',
        name: 'embeddable.Renderer',
      },
    ]);
  });

  it('ignores invalid names and unrelated helper calls', () => {
    const source = `
      import { createTokenFactory } from '@kbn/plugin-di';

      const sloTokens = createTokenFactory('slo');

      export const InvalidToken = sloTokens.service<Bad>('bad_name');
      export const NotAToken = createSomethingElse('slo').service<Bad>('Ignored');
    `;

    expect(extractTokenMetadataFromSource(source)).toEqual([]);
  });
});

describe('mergeGlobals', () => {
  const empty = () => ({
    services: { provides: [] as string[], consumes: [] as string[] },
    extensionPoints: { hosts: [] as string[], contributes: [] as string[] },
  });

  it('preserves manifest-only consumes that static analysis cannot see (lazy resolution survives --fix)', () => {
    const detected = empty();
    detected.services.consumes = ['other.StaticallyDetected'];
    const manifest = empty();
    manifest.services.consumes = ['other.LazilyResolved'];

    expect(mergeGlobals(detected, manifest).services.consumes).toEqual([
      'other.LazilyResolved',
      'other.StaticallyDetected',
    ]);
  });

  it('preserves manifest-only entries across every category', () => {
    const manifest = {
      services: { provides: ['me.Provided'], consumes: ['other.Consumed'] },
      extensionPoints: { hosts: ['me.Hosted'], contributes: ['other.Contributed'] },
    };

    expect(mergeGlobals(empty(), manifest)).toEqual(manifest);
  });

  it('adds detected values, de-duplicates, and sorts', () => {
    const detected = empty();
    detected.services.provides = ['me.B', 'me.A'];
    detected.services.consumes = ['other.Shared'];
    const manifest = empty();
    manifest.services.provides = ['me.A'];
    manifest.services.consumes = ['other.Shared'];

    expect(mergeGlobals(detected, manifest).services).toEqual({
      provides: ['me.A', 'me.B'],
      consumes: ['other.Shared'],
    });
  });
});

describe('extractArgIdentifiers', () => {
  it('captures a bare identifier at the default (first) argument position', () => {
    expect(extractArgIdentifiers(`provide(MyToken, factory);`, 'provide')).toEqual(['MyToken']);
  });

  it('captures the requested argument index', () => {
    expect(extractArgIdentifiers(`getService(container, MyToken);`, 'getService', 1)).toEqual([
      'MyToken',
    ]);
  });

  it('tolerates generic type arguments before the call', () => {
    expect(extractArgIdentifiers(`getService<MyType>(container, MyToken);`, 'getService', 1)).toEqual(
      ['MyToken']
    );
  });

  it('tolerates a member expression in a non-target argument position', () => {
    expect(extractArgIdentifiers(`getService(this.container, MyToken);`, 'getService', 1)).toEqual([
      'MyToken',
    ]);
  });

  it('tolerates a nested call in a non-target argument position', () => {
    expect(extractArgIdentifiers(`getService(wrap(this.c), MyToken);`, 'getService', 1)).toEqual([
      'MyToken',
    ]);
  });

  it('collects every matching call', () => {
    const source = `provide(TokenA, a); provide(TokenB, b);`;
    expect(extractArgIdentifiers(source, 'provide')).toEqual(['TokenA', 'TokenB']);
  });

  it('matches a call even when the helper is also destructured', () => {
    const source = `const { provide, host } = api; provide(MyToken, factory);`;
    expect(extractArgIdentifiers(source, 'provide')).toEqual(['MyToken']);
  });

  it('ignores member calls (obj.fn(...)) — these helpers are invoked bare', () => {
    expect(extractArgIdentifiers(`registry.provide(MyToken);`, 'provide')).toEqual([]);
  });

  it('does not capture a non-identifier (call/member) in the target position', () => {
    expect(extractArgIdentifiers(`useService(makeToken());`, 'useService')).toEqual([]);
    expect(extractArgIdentifiers(`getService(container, this.token);`, 'getService', 1)).toEqual([]);
  });

  it('does not capture string-literal arguments as identifiers', () => {
    expect(extractArgIdentifiers(`useService('literal');`, 'useService')).toEqual([]);
  });
});
