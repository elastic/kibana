/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';

import {
  NoDataConfigPageProvider,
  NoDataConfigPageKibanaProvider,
} from '@kbn/shared-ux-page-no-data-config';

import {
  KibanaPageTemplateServices,
  KibanaPageTemplateKibanaDependencies,
} from '@kbn/shared-ux-page-kibana-template-types';

/**
 * A Context Provider that provides services to the component and its dependencies.
 */
export const KibanaPageTemplateProvider: FC<KibanaPageTemplateServices> = ({
  children,
  ...services
}) => {
  return <NoDataConfigPageProvider {...services}>{children}</NoDataConfigPageProvider>;
};

/**
 * Kibana-specific Provider that maps dependencies to services.
 */
export const KibanaPageTemplateKibanaProvider: FC<KibanaPageTemplateKibanaDependencies> = ({
  children,
  ...dependencies
}) => {
  return (
    <NoDataConfigPageKibanaProvider {...dependencies}>{children}</NoDataConfigPageKibanaProvider>
  );
};
