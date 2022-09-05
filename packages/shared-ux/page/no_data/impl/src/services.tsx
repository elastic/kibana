/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';

import { NoDataCardKibanaProvider, NoDataCardProvider } from '@kbn/shared-ux-card-no-data';

import type {
  NoDataPageServices,
  NoDataPageKibanaDependencies,
} from '@kbn/shared-ux-page-no-data-types';

/**
 * A Context Provider that provides services to the component and its dependencies.
 */
export const NoDataPageProvider: FC<NoDataPageServices> = ({ children, ...services }) => {
  return <NoDataCardProvider {...services}>{children}</NoDataCardProvider>;
};

/**
 * Kibana-specific Provider that maps dependencies to services.
 */
export const NoDataPageKibanaProvider: FC<NoDataPageKibanaDependencies> = ({
  children,
  ...dependencies
}) => {
  return <NoDataCardKibanaProvider {...dependencies}>{children}</NoDataCardKibanaProvider>;
};
