/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';

import {
  FieldRowProvider,
  FieldRowKibanaProvider,
  type FieldRowKibanaDependencies,
  type FieldRowServices,
} from '@kbn/management-settings-components-field-row';

export type SettingsApplicationServices = FieldRowServices;
export type SettingsApplicationKibanaDependencies = FieldRowKibanaDependencies;

/**
 * A Context Provider that provides services to the component and its dependencies.
 */
export const SettingsApplicationProvider: FC<SettingsApplicationServices> = ({
  children,
  ...services
}) => {
  return <FieldRowProvider {...services}>{children}</FieldRowProvider>;
};

/**
 * Kibana-specific Provider that maps dependencies to services.
 */
export const SettingsApplicationKibanaProvider: FC<SettingsApplicationKibanaDependencies> = ({
  children,
  ...dependencies
}) => {
  return <FieldRowKibanaProvider {...dependencies}>{children}</FieldRowKibanaProvider>;
};
