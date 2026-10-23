/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { of } from 'rxjs';
import { coreMock } from '@kbn/core/server/mocks';
import { createEmbeddableSetupMock } from '@kbn/embeddable-plugin/server/mocks';
import { mockGetDrilldownsSchema } from '@kbn/embeddable-plugin/server/mocks';
import { VisTypeVegaPlugin } from './plugin';
import {
  VEGA_API_ENABLED_FLAG,
  VEGA_EMBEDDABLE_TYPE,
  VEGA_STANDALONE_EMBEDDABLE_FLAG,
} from '../common/constants';

describe('VisTypeVegaPlugin (server)', () => {
  test('registers a server definition for vega', async () => {
    const initializerContext = coreMock.createPluginInitializerContext();
    const coreSetup = coreMock.createSetup();
    const coreStart = coreMock.createStart();
    coreSetup.getStartServices.mockResolvedValue([coreStart, {}, {}]);
    const embeddable = createEmbeddableSetupMock();

    const plugin = new VisTypeVegaPlugin(initializerContext);
    plugin.setup(coreSetup, { embeddable });
    await new Promise(process.nextTick);

    expect(embeddable.registerEmbeddableServerDefinition).toHaveBeenCalledTimes(1);
    expect(embeddable.registerEmbeddableServerDefinition).toHaveBeenCalledWith(
      VEGA_EMBEDDABLE_TYPE,
      expect.any(Object)
    );
  });

  test('does not expose a schema when vega.standaloneEmbeddable is disabled', async () => {
    const initializerContext = coreMock.createPluginInitializerContext();
    const coreSetup = coreMock.createSetup();
    const coreStart = coreMock.createStart();
    coreStart.featureFlags.getBooleanValue$.mockImplementation((key, fallback) =>
      of(key === VEGA_STANDALONE_EMBEDDABLE_FLAG ? false : fallback)
    );
    coreSetup.getStartServices.mockResolvedValue([coreStart, {}, {}]);

    const embeddable = createEmbeddableSetupMock();
    const plugin = new VisTypeVegaPlugin(initializerContext);
    plugin.setup(coreSetup, { embeddable });
    await new Promise(process.nextTick);

    const [, serverDefinition] = embeddable.registerEmbeddableServerDefinition.mock.calls[0];
    expect(serverDefinition.getSchema(mockGetDrilldownsSchema)).toBeUndefined();
  });

  test('exposes a schema when vega.standaloneEmbeddable is enabled', async () => {
    const initializerContext = coreMock.createPluginInitializerContext();
    const coreSetup = coreMock.createSetup();
    const coreStart = coreMock.createStart();
    coreStart.featureFlags.getBooleanValue$.mockImplementation((key, fallback) =>
      of(key === VEGA_STANDALONE_EMBEDDABLE_FLAG ? true : fallback)
    );
    coreSetup.getStartServices.mockResolvedValue([coreStart, {}, {}]);

    const embeddable = createEmbeddableSetupMock();
    const plugin = new VisTypeVegaPlugin(initializerContext);
    plugin.setup(coreSetup, { embeddable });
    await new Promise(process.nextTick);

    const [, serverDefinition] = embeddable.registerEmbeddableServerDefinition.mock.calls[0];
    const schema = serverDefinition.getSchema(mockGetDrilldownsSchema);
    expect(schema).toBeDefined();

    const validSpec = { format: 'hjson', value: '{ mark: point }' };
    const parsed = schema!.parse({ spec: validSpec, unknown_key: 'ignored' });
    expect(parsed.spec).toEqual(validSpec);
    expect(parsed).not.toHaveProperty('unknown_key');

    expect(() => schema!.parse({})).toThrow();
    expect(() => schema!.parse({ spec: 123 })).toThrow();
    expect(() => schema!.parse({ spec: '' })).toThrow();
    expect(() => schema!.parse({ spec: { format: 'hjson', value: '' } })).toThrow();
    expect(() => schema!.parse({ spec: { format: 'json', value: 'not-an-object' } })).toThrow();
    expect(() => schema!.parse({ ref_id: 'library-item' })).toThrow();
  });

  test('accepts by-reference panels when vega.apiEnabled is also enabled', async () => {
    const initializerContext = coreMock.createPluginInitializerContext();
    const coreSetup = coreMock.createSetup();
    const coreStart = coreMock.createStart();
    coreStart.featureFlags.getBooleanValue$.mockImplementation((key, fallback) =>
      of(key === VEGA_STANDALONE_EMBEDDABLE_FLAG || key === VEGA_API_ENABLED_FLAG ? true : fallback)
    );
    coreSetup.getStartServices.mockResolvedValue([coreStart, {}, {}]);

    const embeddable = createEmbeddableSetupMock();
    const plugin = new VisTypeVegaPlugin(initializerContext);
    plugin.setup(coreSetup, { embeddable });
    await new Promise(process.nextTick);

    const [, serverDefinition] = embeddable.registerEmbeddableServerDefinition.mock.calls[0];
    const schema = serverDefinition.getSchema(mockGetDrilldownsSchema);
    const query = { language: 'kql', expression: 'bytes > 1000' };

    // The library item owns the query and filters.
    expect(schema!.parse({ ref_id: 'library-item', query })).toEqual({ ref_id: 'library-item' });
    expect(schema!.parse({ spec: { format: 'hjson', value: '{}' } })).toHaveProperty('spec');
    expect(() => schema!.parse({})).toThrow();
  });
});
