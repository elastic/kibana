/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';

import { NoDataPageProvider, NoDataPageKibanaProvider } from '@kbn/shared-ux-page-no-data';
import type {
  NoDataConfigPageServices,
  NoDataConfigPageKibanaDependencies,
} from '@kbn/shared-ux-page-no-data-config-types';

/**
 * A Context Provider that provides services to the component and its dependencies.
 */
export const NoDataConfigPageProvider: FC<NoDataConfigPageServices> = ({
  children,
  ...services
}) => {
  return <NoDataPageProvider {...services}>{children}</NoDataPageProvider>;
};

/**
 * Kibana-specific Provider that maps dependencies to services.
 */
export const NoDataConfigPageKibanaProvider: FC<NoDataConfigPageKibanaDependencies> = ({
  children,
  ...dependencies
}) => {
  return <NoDataPageKibanaProvider {...dependencies}>{children}</NoDataPageKibanaProvider>;
};
