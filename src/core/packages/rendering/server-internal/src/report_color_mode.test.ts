/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { getReportColorModeOverride, KBN_REPORT_COLOR_MODE_HEADER } from './report_color_mode';

describe('getReportColorModeOverride', () => {
  it('returns false for light', () => {
    const request = httpServerMock.createKibanaRequest({
      headers: { [KBN_REPORT_COLOR_MODE_HEADER]: 'light' },
    });
    expect(getReportColorModeOverride(request)).toBe(false);
  });

  it('returns true for dark', () => {
    const request = httpServerMock.createKibanaRequest({
      headers: { [KBN_REPORT_COLOR_MODE_HEADER]: 'dark' },
    });
    expect(getReportColorModeOverride(request)).toBe(true);
  });

  it('returns undefined when the header is absent or invalid', () => {
    expect(getReportColorModeOverride(httpServerMock.createKibanaRequest())).toBeUndefined();
    expect(
      getReportColorModeOverride(
        httpServerMock.createKibanaRequest({
          headers: { [KBN_REPORT_COLOR_MODE_HEADER]: 'system' },
        })
      )
    ).toBeUndefined();
  });
});
