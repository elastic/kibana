/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreMock } from '@kbn/core/server/mocks';
import { createEmbeddableSetupMock } from '@kbn/embeddable-plugin/server/mocks';
import { mockGetDrilldownsSchema } from '@kbn/embeddable-plugin/server/mocks';
import { VisTypeVegaPlugin } from './plugin';
import { VEGA_EMBEDDABLE_TYPE } from '../common/constants';

describe('VisTypeVegaPlugin (server)', () => {
  const setup = () => {
    const coreSetup = coreMock.createSetup();
    const embeddable = createEmbeddableSetupMock();
    const plugin = new VisTypeVegaPlugin(coreMock.createPluginInitializerContext());
    plugin.setup(coreSetup, { embeddable });
    return embeddable;
  };

  test('registers a server definition for vega', () => {
    const embeddable = setup();

    expect(embeddable.registerEmbeddableServerDefinition).toHaveBeenCalledTimes(1);
    expect(embeddable.registerEmbeddableServerDefinition).toHaveBeenCalledWith(
      VEGA_EMBEDDABLE_TYPE,
      expect.any(Object)
    );
  });

  test('exposes a schema for by-value and by-reference panels', () => {
    const embeddable = setup();

    const [, serverDefinition] = embeddable.registerEmbeddableServerDefinition.mock.calls[0];
    const schema = serverDefinition.getSchema(mockGetDrilldownsSchema);
    expect(schema).toBeDefined();

    const validSpec = { format: 'hjson', value: '{ mark: point }' };
    const parsed = schema!.parse({ spec: validSpec, unknown_key: 'ignored' });
    expect(parsed.spec).toEqual(validSpec);
    expect(parsed).not.toHaveProperty('unknown_key');

    const query = { language: 'kql', expression: 'bytes > 1000' };
    expect(schema!.parse({ ref_id: 'library-item', query })).toEqual({
      ref_id: 'library-item',
      query,
    });

    expect(() => schema!.parse({})).toThrow();
    expect(() => schema!.parse({ spec: 123 })).toThrow();
    expect(() => schema!.parse({ spec: '' })).toThrow();
    expect(() => schema!.parse({ spec: { format: 'hjson', value: '' } })).toThrow();
    expect(() => schema!.parse({ spec: { format: 'json', value: 'not-an-object' } })).toThrow();
  });
});
