/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AS_CODE_DATA_VIEW_REFERENCE_TYPE } from '@kbn/as-code-data-views-schema';
import { coreMock } from '@kbn/core/server/mocks';
import { DATA_TABLE_JSON_VIEW_FEATURE_FLAG_KEY } from '../common/constants';
import { discoverSessionSchemaProvider } from './discover_session_schema_provider';

const sessionWithJsonView = {
  title: 'JSON view session',
  tabs: [
    {
      id: 'tab-classic',
      label: 'Logs',
      data_source: {
        type: AS_CODE_DATA_VIEW_REFERENCE_TYPE,
        ref_id: 'logs-data-view',
      },
      filters: [],
      sort: [],
      view_mode: 'documents',
      hide_chart: false,
      hide_table: false,
      time_restore: false,
      documents_display_mode: 'json',
      json_mode_settings: { hide_nulls: true, wrap_lines: false },
    },
  ],
};

const parseApiData = () =>
  discoverSessionSchemaProvider
    .getApiSchemas()
    .discoverSessionApiDataSchema.parse(sessionWithJsonView);

describe('discoverSessionSchemaProvider', () => {
  afterEach(async () => {
    const coreStart = coreMock.createStart();
    coreStart.featureFlags.getBooleanValue.mockResolvedValue(false);
    await discoverSessionSchemaProvider.initialize(coreStart.featureFlags);
  });

  it('selects canonical schemas when the feature flag is enabled', async () => {
    const coreStart = coreMock.createStart();
    coreStart.featureFlags.getBooleanValue.mockResolvedValue(true);

    await discoverSessionSchemaProvider.initialize(coreStart.featureFlags);

    expect(coreStart.featureFlags.getBooleanValue).toHaveBeenCalledWith(
      DATA_TABLE_JSON_VIEW_FEATURE_FLAG_KEY,
      false
    );
    expect(parseApiData().tabs[0]).toEqual(
      expect.objectContaining({
        documents_display_mode: 'json',
        json_mode_settings: { hide_nulls: true, wrap_lines: false },
      })
    );
  });

  it('keeps restricted schemas until the feature flag resolves', async () => {
    const coreStart = coreMock.createStart();
    let resolveFlag!: (enabled: boolean) => void;
    coreStart.featureFlags.getBooleanValue.mockReturnValue(
      new Promise((resolve) => {
        resolveFlag = resolve;
      })
    );

    const initializePromise = discoverSessionSchemaProvider.initialize(coreStart.featureFlags);

    expect(() => parseApiData()).toThrow(/Unrecognized key/);

    resolveFlag(true);
    await initializePromise;

    expect(parseApiData().tabs[0]).toEqual(
      expect.objectContaining({ documents_display_mode: 'json' })
    );
  });

  it('keeps restricted schemas when feature flag resolution fails', async () => {
    const coreStart = coreMock.createStart();
    coreStart.featureFlags.getBooleanValue.mockRejectedValue(new Error('flag service unavailable'));

    await expect(discoverSessionSchemaProvider.initialize(coreStart.featureFlags)).rejects.toThrow(
      'flag service unavailable'
    );
    expect(() => parseApiData()).toThrow(/Unrecognized key/);
  });
});
