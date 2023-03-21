/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ReactNode } from 'react';
import { EuiPageTemplateProps, EuiPageSidebarProps } from '@elastic/eui';

import type {
  NoDataPageProps,
  NoDataPageServices,
  NoDataPageKibanaDependencies,
} from '@kbn/shared-ux-page-no-data-types';

export type NoDataConfigPageKibanaDependencies = NoDataPageKibanaDependencies;
export type NoDataConfigPageServices = NoDataPageServices;
export type NoDataConfig = NoDataPageProps;

export type NoDataConfigPageProps = EuiPageTemplateProps & {
  /**
   * Accepts a configuration object, that when provided, ignores `pageHeader` and `children` and instead
   * displays Agent, Beats, and custom cards to direct users to the right ingest location
   */
  noDataConfig?: NoDataConfig;
  /**
   * BWC Props from old EUI template
   */
  pageSideBar?: ReactNode;
  pageSideBarProps?: EuiPageSidebarProps;
};
