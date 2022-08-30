/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { KibanaPageTemplate } from './src/page_template';
export { KibanaPageTemplateProvider, KibanaPageTemplateKibanaProvider } from './src/services';
export type {
  NoDataConfig,
  KibanaPageTemplateProps,
  KibanaPageTemplateServices,
  KibanaPageTemplateKibanaDependencies,
} from '@kbn/shared-ux-page-kibana-template-types';
