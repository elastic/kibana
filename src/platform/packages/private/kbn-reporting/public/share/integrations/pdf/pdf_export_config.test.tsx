/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { NEVER } from 'rxjs';
import { getShareMenuItems } from './pdf_export_config';

describe('PDF export config', () => {
  const getConfig = (isExperimental: boolean) =>
    getShareMenuItems({
      apiClient: {},
      startServices$: NEVER,
      isExperimental,
    } as unknown as Parameters<typeof getShareMenuItems>[0])({
      objectType: 'dashboard',
      isDirty: false,
      sharingData: { title: 'test', locatorParams: { id: 'test', params: {} } },
    } as unknown as Parameters<ReturnType<typeof getShareMenuItems>>[0]);

  it('badges the export when it is experimental', () => {
    expect(getConfig(true).badge).toEqual({
      label: 'Experimental',
      tooltipContent:
        'This functionality is experimental and may be changed or removed in a future release.',
    });
  });

  it('does not badge the export when it is not experimental', () => {
    expect(getConfig(false).badge).toBeUndefined();
  });
});
