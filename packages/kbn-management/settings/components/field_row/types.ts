/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DocLinksStart } from '@kbn/core-doc-links-browser';

import type {
  FieldInputServices,
  FieldInputKibanaDependencies,
} from '@kbn/management-settings-components-field-input';

/**
 * Contextual services used by a {@link FieldRow} component.
 */
export interface Services {
  links: { [key: string]: string };
}

/**
 * Contextual services used by a {@link FieldRow} component and its dependents.
 */
export type FieldRowServices = FieldInputServices & Services;

/**
 * An interface containing a collection of Kibana plugins and services required to
 * render a {@link FieldRow} component.
 */
export interface KibanaDependencies {
  docLinks: {
    links: {
      management: DocLinksStart['links']['management'];
    };
  };
}

/**
 * An interface containing a collection of Kibana plugins and services required to
 * render a {@link FieldRow} component and its dependents.
 */
export type FieldRowKibanaDependencies = KibanaDependencies & FieldInputKibanaDependencies;
