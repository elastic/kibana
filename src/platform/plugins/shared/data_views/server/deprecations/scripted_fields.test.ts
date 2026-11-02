/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { GetDeprecationsContext, SavedObjectsFindResponse } from '@kbn/core/server';
import {
  coreMock,
  elasticsearchServiceMock,
  httpServerMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import { createScriptedFieldsDeprecationsConfig, hasScriptedField } from './scripted_fields';

const createDeprecationsContext = (
  savedObjects: SavedObjectsFindResponse['saved_objects'] = []
): GetDeprecationsContext & {
  savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;
} => {
  const savedObjectsClient = savedObjectsClientMock.create();
  savedObjectsClient.createPointInTimeFinder.mockReturnValue({
    close: jest.fn(),
    find: async function* find() {
      yield { saved_objects: savedObjects } as SavedObjectsFindResponse;
    },
  });
  const esClient = elasticsearchServiceMock.createScopedClusterClient();
  return { savedObjectsClient, esClient, request: httpServerMock.createKibanaRequest() };
};

describe('createScriptedFieldsDeprecationsConfig', () => {
  const { getDeprecations } = createScriptedFieldsDeprecationsConfig(coreMock.createSetup());

  test('returns no deprecations when there are no data views', async () => {
    const context = createDeprecationsContext();

    await expect(getDeprecations(context)).resolves.toEqual([]);
  });

  test('searches data views in all the spaces', async () => {
    const context = createDeprecationsContext();

    await getDeprecations(context);

    expect(context.savedObjectsClient.createPointInTimeFinder).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'index-pattern', namespaces: ['*'] })
    );
  });
});

describe('hasScriptedField', () => {
  test('valid index pattern object with a scripted field', () => {
    expect(
      hasScriptedField({
        title: 'kibana_sample_data_logs*',
        fields:
          '[{"count":0,"script":"return 5;","lang":"painless","name":"test","type":"number","scripted":true,"searchable":true,"aggregatable":true,"readFromDocValues":false,"customLabel":""}]',
      })
    ).toBe(true);
  });

  test('valid index pattern object without a scripted field', () => {
    expect(
      hasScriptedField({
        title: 'kibana_sample_data_logs*',
        fields: '[]',
      })
    ).toBe(false);
  });

  test('invalid index pattern object', () => {
    expect(
      hasScriptedField({
        title: 'kibana_sample_data_logs*',
        fields: '[...]',
      })
    ).toBe(false);
  });
});
