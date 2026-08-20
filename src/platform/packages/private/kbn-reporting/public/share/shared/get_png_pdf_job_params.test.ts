/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getJobParams, getPdfReportParams, getPngReportParams } from './get_png_pdf_job_params';

const sharingData = {
  title: 'Dashboard title',
  locatorParams: { id: 'DASHBOARD_APP_LOCATOR', params: { dashboardId: 'abc' } },
};

describe('getPngPdfJobParams', () => {
  it('includes colorMode on PNG params', () => {
    const params = getPngReportParams({ sharingData, colorMode: 'dark' });
    expect(params.colorMode).toBe('dark');
    expect(params.layout.id).toBe('preserve_layout');
  });

  it('includes colorMode on PDF params and sets print layout', () => {
    const params = getPdfReportParams({
      sharingData,
      optimizedForPrinting: true,
      colorMode: 'light',
    });
    expect(params.colorMode).toBe('light');
    expect(params.layout.id).toBe('print');
  });

  it('omits colorMode when it is not provided', () => {
    const params = getPngReportParams({ sharingData });
    expect(params.colorMode).toBeUndefined();
  });

  it('forwards colorMode from getJobParams', () => {
    const params = getJobParams(
      {
        sharingData,
        objectType: 'dashboard',
        colorMode: 'dark',
      },
      'pngV2'
    )();
    expect(params.colorMode).toBe('dark');
    expect(params.objectType).toBe('dashboard');
    expect(params.title).toBe('Dashboard title');
  });
});
