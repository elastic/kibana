/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  FieldRowServices,
  FieldRowKibanaDependencies,
} from '@kbn/management-settings-components-field-row';

/**
 * Contextual services used by a {@link FieldCategory} component and its dependents.
 */
export type FieldCategoryServices = FieldRowServices;

/**
 * An interface containing a collection of Kibana plugins and services required to
 * render a {@link FieldCategory} component and its dependents.
 */
export type FieldCategoryKibanaDependencies = FieldRowKibanaDependencies;
