/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Rx from 'rxjs';

import type { ApplicationStart, CoreStart } from '@kbn/core/public';
import { ILicense } from '@kbn/licensing-plugin/public';

import type { ReportingAPIClient } from '../../reporting_api_client';

export type StartServices = [
  Pick<
    CoreStart,
    // required for modules that render React
    | 'analytics'
    | 'i18n'
    | 'theme'
    // used extensively in Reporting share context menus and modal
    | 'notifications'
  >,
  unknown,
  unknown
];

export interface ExportModalShareOpts {
  apiClient: ReportingAPIClient;
  license: ILicense;
  application: ApplicationStart;
  startServices$: Rx.Observable<StartServices>;
}

export interface ExportPanelShareOpts {
  apiClient: ReportingAPIClient;
  license: ILicense;
  application: ApplicationStart;
  startServices$: Rx.Observable<StartServices>;
}

export interface ReportingSharingData {
  title: string;
  reportingDisabled?: boolean;
  locatorParams: {
    id: string;
    params: unknown;
  };
}

export interface JobParamsProviderOptions {
  sharingData: ReportingSharingData;
  shareableUrl?: string;
  objectType: string;
  optimizedForPrinting?: boolean;
}
