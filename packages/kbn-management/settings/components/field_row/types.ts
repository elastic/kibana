/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DocLinksStart } from '@kbn/core-doc-links-browser';

import type {
  FieldInputServices,
  FieldInputKibanaDependencies,
} from '@kbn/management-settings-components-field-input';
import { SettingType, UnsavedFieldChange } from '@kbn/management-settings-types';

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

/**
 * An `onChange` handler for a {@link FieldRow} component.
 * @param id A unique id corresponding to the particular setting being changed.
 * @param change The {@link UnsavedFieldChange} corresponding to any unsaved change to the field.
 */
export type OnChangeFn<T extends SettingType> = (id: string, change: UnsavedFieldChange<T>) => void;
