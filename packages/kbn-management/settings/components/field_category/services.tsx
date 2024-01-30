/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import {
  FieldRowProvider,
  FieldRowKibanaProvider,
} from '@kbn/management-settings-components-field-row';

import type { FieldCategoryServices } from './types';

/**
 * Props for {@link FieldCategoryProvider}.
 */
export interface FieldCategoryProviderProps extends FieldCategoryServices {
  children: React.ReactNode;
}

/**
 * React Provider that provides services to a {@link FieldCategory} component and its dependents.
 */
export const FieldCategoryProvider = FieldRowProvider;

/**
 * Kibana-specific Provider that maps Kibana plugins and services to a {@link FieldCategoryProvider}.
 */
export const FieldCategoryKibanaProvider = FieldRowKibanaProvider;
