/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';

import {
  FormProvider,
  FormKibanaProvider,
  type FormKibanaDependencies,
  type FormServices,
} from '@kbn/management-settings-components-form';

export type SettingsApplicationServices = FormServices;
export type SettingsApplicationKibanaDependencies = FormKibanaDependencies;

/**
 * A Context Provider that provides services to the component and its dependencies.
 */
export const SettingsApplicationProvider: FC<SettingsApplicationServices> = ({
  children,
  ...services
}) => {
  return <FormProvider {...services}>{children}</FormProvider>;
};

/**
 * Kibana-specific Provider that maps dependencies to services.
 */
export const SettingsApplicationKibanaProvider: FC<SettingsApplicationKibanaDependencies> = ({
  children,
  ...dependencies
}) => {
  return <FormKibanaProvider {...dependencies}>{children}</FormKibanaProvider>;
};
