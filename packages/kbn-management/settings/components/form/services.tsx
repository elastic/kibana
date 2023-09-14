/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  FieldRowProvider,
  FieldRowKibanaProvider,
  type FieldRowKibanaDependencies,
  type FieldRowServices,
} from '@kbn/management-settings-components-field-row';
import React, { FC } from 'react';

export type FormServices = FieldRowServices;
export type FormKibanaDependencies = FieldRowKibanaDependencies;

/**
 * React Provider that provides services to a {@link Form} component and its dependents.
 */
export const FormProvider: FC<FormServices> = ({ children, ...services }) => {
  return <FieldRowProvider {...services}>{children}</FieldRowProvider>;
};

/**
 * Kibana-specific Provider that maps Kibana plugins and services to a {@link FormProvider}.
 */
export const FormKibanaProvider: FC<FormKibanaDependencies> = ({ children, ...services }) => {
  return <FieldRowKibanaProvider {...services}>{children}</FieldRowKibanaProvider>;
};
