/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  CSV_JOB_TYPE_V2,
  CSV_JOB_TYPE,
  JobAppParamsCSV,
  JobAppParamsCsvV2,
} from '@kbn/reporting-export-types-csv-common';
import type { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import { LocatorParams, BaseParams } from '@kbn/reporting-common/types';
import type { ReportingAPIClient } from '../../reporting_api_client';

export type CsvSearchModeParams =
  | {
      isEsqlMode: false;
      searchSource: SerializedSearchSourceFields;
      columns: string[] | undefined;
    }
  | {
      isEsqlMode: true;
      locatorParams: LocatorParams[];
    };

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
  reportType: typeof CSV_JOB_TYPE_V2 | typeof CSV_JOB_TYPE;
  decoratedJobParams: BaseParams;
} => {
  // only csv v2 supports esql reports
  // TODO: whole csv reporting should move to v2 https://github.com/elastic/kibana/issues/151190
  const reportType = searchModeParams.isEsqlMode ? CSV_JOB_TYPE_V2 : CSV_JOB_TYPE;

  const commonJobParams = {
    title,
    objectType: 'search',
  };

  if (searchModeParams.isEsqlMode) {
    // csv v2 uses locator params

    return {
      reportType,
      decoratedJobParams: apiClient.getDecoratedJobParams<JobAppParamsCsvV2>({
        ...commonJobParams,
        locatorParams: searchModeParams.locatorParams,
      }),
    };
  }

  // csv v1 uses search source and columns
  return {
    reportType,
    decoratedJobParams: apiClient.getDecoratedJobParams<JobAppParamsCSV>({
      ...commonJobParams,
      columns: searchModeParams.columns,
      searchSource: searchModeParams.searchSource,
    }),
  };
};
