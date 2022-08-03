/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiPageTemplateProps } from '@elastic/eui';

import type {
  NoDataPageProps,
  NoDataPageServices,
  NoDataPageKibanaDependencies,
} from '@kbn/shared-ux-page-no-data-types';
import { KibanaPageTemplateProps } from '@kbn/shared-ux-page-kibana-template-types';

export type NoDataConfigPageKibanaDependencies = NoDataPageKibanaDependencies;
export type NoDataConfigPageServices = NoDataPageServices;
export type NoDataConfig = NoDataPageProps;

export type NoDataConfigPageProps = EuiPageTemplateProps &
  Pick<KibanaPageTemplateProps, 'solutionNav' | 'noDataConfig'>;
