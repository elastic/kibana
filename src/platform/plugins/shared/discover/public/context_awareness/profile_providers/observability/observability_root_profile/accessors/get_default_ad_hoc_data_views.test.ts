/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SolutionType } from '../../../../profiles';
import { getDefaultAdHocDataViews } from './get_default_ad_hoc_data_views';

describe('getDefaultAdHocDataViews', () => {
  it('must return "discover-observability-root-profile-all-logs" for the "All logs" data view ID or bookmarks will break', () => {
    const dataViews = getDefaultAdHocDataViews!(() => [], {
      context: { solutionType: SolutionType.Observability, allLogsIndexPattern: 'logs-*' },
    })();
    expect(dataViews).toEqual([
      expect.objectContaining({
        id: 'discover-observability-root-profile-all-logs',
        name: 'All logs',
      }),
    ]);
  });
});
