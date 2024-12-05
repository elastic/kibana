/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ReactElement } from 'react';

import { UiCounterMetricType } from '@kbn/analytics';
import { DeprecationSettings } from '@kbn/core-ui-settings-common';

import { KnownTypeToValue, SettingType } from './setting_type';

/**
 * A {@link FieldDefinition} adapts a {@link UiSettingMetadata} object to be more
 * easily consumed by the UI.  It contains additional information about the field
 * that is determined from a given UiSettingMetadata object, (which is a type
 * representing a UiSetting).
 * @public
 */
export interface FieldDefinition<
  T extends SettingType = SettingType,
  V = KnownTypeToValue<T> | null
> {
  /** UX ARIA attributes derived from the setting. */
  ariaAttributes: {
    /** The `aria-label` attribute for the field input. */
    ariaLabel: string;
    /** The `aria-describedby` attribute for the field input. */
    ariaDescribedBy?: string;
  };
  /** A list of categories related to the field. */
  categories: string[];
  /** The default value of the field from Kibana. */
  defaultValue?: V;
  /** The text-based display of the default value, for use in the UI. */
  defaultValueDisplay: string;
  /**
   * Deprecation information for the field
   * @see {@link DeprecationSettings}
   */
  deprecation?: DeprecationSettings;
  /** A description of the field. */
  description?: string | ReactElement;
  /** The name of the field suitable for display in the UX. */
  displayName: string;
  /** The grouping identifier for the field. */
  groupId: string;
  /** The unique identifier of the field, typically separated by `:` */
  id: string;
  /** True if the field is a custom setting, false otherwise. */
  isCustom: boolean;
  /** True if the current saved setting matches the default setting. */
  isDefaultValue: boolean;
  /** True if the setting is overridden in Kibana, false otherwise. */
  isOverridden: boolean;
  /** True if the setting is read-only, false otherwise. */
  isReadOnly: boolean;
  /** Metric information when one interacts with the field. */
  metric?: {
    /** The metric name. */
    name?: string;
    /** The metric type. */
    type?: UiCounterMetricType;
  };
  /** The name of the field suitable for use in the UX. */
  name: string;
  /** Option information if the field represents a `select` setting. */
  options?: {
    /** Option values for the field. */
    values: string[] | number[];
    /** Option labels organized by value. */
    labels: Record<string, string>;
  };
  /** A rank order for the field relative to other fields. */
  order: number | undefined;
  /** True if the browser must be reloaded for the setting to take effect, false otherwise. */
  requiresPageReload: boolean;
  /** The current saved value of the setting. */
  savedValue?: V;
  /**
   * The type of setting the field represents.
   * @see {@link SettingType}
   */
  type: T;
  /** An identifier of the field when it has an unsaved change. */
  unsavedFieldId: string;
}

/**
 * This is a {@link FieldDefinition} representing {@link UiSetting} `array` type
 * for use in the UI.
 */
export type ArrayFieldDefinition = FieldDefinition<'array'>;

/**
 * This is a {@link FieldDefinition} representing {@link UiSetting} `boolean` type
 * for use in the UI.
 */
export type BooleanFieldDefinition = FieldDefinition<'boolean'>;

/**
 * This is a {@link FieldDefinition} representing {@link UiSetting} `color` type
 * for use in the UI.
 */
export type ColorFieldDefinition = FieldDefinition<'color'>;

/**
 * This is a {@link FieldDefinition} representing {@link UiSetting} `image` type
 * for use in the UI.
 */
export type ImageFieldDefinition = FieldDefinition<'image'>;

/**
 * This is a {@link FieldDefinition} representing {@link UiSetting} `json` type
 * for use in the UI.
 */
export type JsonFieldDefinition = FieldDefinition<'json'>;

/**
 * This is a {@link FieldDefinition} representing {@link UiSetting} `markdown` type
 * for use in the UI.
 */
export type MarkdownFieldDefinition = FieldDefinition<'markdown'>;

/**
 * This is a {@link FieldDefinition} representing {@link UiSetting} `number` type
 * for use in the UI.
 */
export type NumberFieldDefinition = FieldDefinition<'number'>;

/**
 * This is a {@link FieldDefinition} representing {@link UiSetting} `select` type
 * for use in the UI.
 */
export interface SelectFieldDefinition extends FieldDefinition<'select'> {
  /** Options are required when this definition is used. */
  options: {
    /** Option values for the field. */
    values: string[] | number[];
    /** Option labels organized by value. */
    labels: Record<string, string>;
  };
}

/**
 * This is a {@link FieldDefinition} representing {@link UiSetting} `string` type
 * for use in the UI.
 */
export type StringFieldDefinition = FieldDefinition<'string'>;

/**
 * This is a {@link FieldDefinition} representing {@link UiSetting} `undefined` type
 * for use in the UI.
 */
export type UndefinedFieldDefinition = FieldDefinition<'undefined'>;
