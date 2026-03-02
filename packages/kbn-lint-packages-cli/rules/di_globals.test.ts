/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { extractTokenMetadataFromSource } from './di_globals';

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
