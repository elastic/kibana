/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReportParamsGetter, ReportParamsGetterOptions } from '../../types';
import type { JobParamsProviderOptions } from '../share_context_menu';

const getBaseParams = (objectType: string) => {
  const el = document.querySelector('[data-shared-items-container]');
  const { height, width } = el ? el.getBoundingClientRect() : { height: 768, width: 1024 };
  const dimensions = { height, width };
  return {
    objectType,
    layout: {
      id: 'preserve_layout' as 'preserve_layout' | 'print',
      dimensions,
    },
  };
};

interface PngPdfReportBaseParams {
  layout: { dimensions: { height: number; width: number }; id: 'preserve_layout' | 'print' };
  objectType: string;
  locatorParams: any;
}

export const getPngReportParams: ReportParamsGetter<
  ReportParamsGetterOptions,
  PngPdfReportBaseParams
> = ({ sharingData }): PngPdfReportBaseParams => {
  return {
    ...getBaseParams('pngV2'),
    locatorParams: sharingData.locatorParams,
  };
};

export const getPdfReportParams: ReportParamsGetter<
  ReportParamsGetterOptions & { optimizedForPrinting?: boolean },
  PngPdfReportBaseParams
> = ({ sharingData, optimizedForPrinting = false }) => {
  const params = {
    ...getBaseParams('printablePdfV2'),
    locatorParams: [sharingData.locatorParams],
  };
  if (optimizedForPrinting) {
    params.layout.id = 'print';
  }
  return params;
};

export const getJobParams =
  (opts: JobParamsProviderOptions, type: 'pngV2' | 'printablePdfV2') => () => {
    const { objectType, sharingData, optimizedForPrinting } = opts;
    let baseParams: PngPdfReportBaseParams;
    if (type === 'pngV2') {
      baseParams = getPngReportParams({ sharingData });
    } else {
      baseParams = getPdfReportParams({
        sharingData,
        optimizedForPrinting,
      });
    }
    return {
      ...baseParams,
      objectType,
      title: sharingData.title,
    };
  };
