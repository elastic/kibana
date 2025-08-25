/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JobAppParamsCsvV2 } from '@kbn/reporting-export-types-csv-common';
import { CSV_JOB_TYPE_V2 } from '@kbn/reporting-export-types-csv-common';
import type { LocatorParams, BaseParams } from '@kbn/reporting-common/types';
import type { ReportingAPIClient } from '../../reporting_api_client';

export interface CsvSearchModeParams {
  locatorParams: LocatorParams[];
}

interface GetSearchCsvJobParams {
  apiClient: ReportingAPIClient;
  searchModeParams: CsvSearchModeParams;
  title: string;
}

export const getSearchCsvJobParams = ({
  apiClient,
  searchModeParams,
  title,
}: GetSearchCsvJobParams): {
  reportType: typeof CSV_JOB_TYPE_V2;
  decoratedJobParams: BaseParams;
} => {
  const commonJobParams = {
    title,
    objectType: 'search',
  };

  return {
    reportType: CSV_JOB_TYPE_V2,
    decoratedJobParams: apiClient.getDecoratedJobParams<JobAppParamsCsvV2>({
      ...commonJobParams,
      locatorParams: searchModeParams.locatorParams,
    }),
  };
};
