/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewEditorService } from './data_view_editor_service';
import { HttpSetup } from '@kbn/core/public';
import { DataViewsServicePublic } from '@kbn/data-views-plugin/public';

describe('DataViewEditorService', () => {
  it('should check for rollup indices when rolls are enabled', () => {
    const get = jest.fn();
    const http = { get } as unknown as HttpSetup;
    new DataViewEditorService({
      services: {
        http,
        dataViews: {
          getIdsWithTitle: jest.fn().mockResolvedValue([]),
          getRollupsEnabled: jest.fn().mockReturnValue(true),
        } as unknown as DataViewsServicePublic,
      },
      initialValues: {},
    });

    expect(get).toHaveBeenCalledTimes(1);
    expect(get.mock.calls[0][0]).toEqual('/api/rollup/indices');
  });
  it('should skip check for rollup indices when rollups are disabled', () => {
    const http = { get: jest.fn() } as unknown as HttpSetup;
    new DataViewEditorService({
      services: {
        http,
        dataViews: {
          getIdsWithTitle: jest.fn().mockResolvedValue([]),
          getRollupsEnabled: jest.fn().mockReturnValue(false),
        } as unknown as DataViewsServicePublic,
      },
      initialValues: {},
    });

    expect(http.get).toHaveBeenCalledTimes(0);
  });
});
