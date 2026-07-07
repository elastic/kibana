/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getAllLogsDataViewSpec } from './get_all_logs_data_view_spec';

describe('getAllLogsDataViewSpec', () => {
  it('must return "discover-observability-solution-all-logs" for the "All logs" data view ID or bookmarks will break', () => {
    const dataView = getAllLogsDataViewSpec({ allLogsIndexPattern: 'logs-*' });
    expect(dataView).toEqual(
      expect.objectContaining({
        id: 'discover-observability-solution-all-logs',
        name: 'All logs',
      })
    );
  });
});
