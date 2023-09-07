/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
export interface FieldDefinition<T extends SettingType, V = KnownTypeToValue<T> | null> {
  ariaAttributes: {
    ariaLabel: string;
    ariaDescribedBy?: string;
  };
  categories: string[];
  defaultValue?: V;
  defaultValueDisplay: string;
  deprecation?: DeprecationSettings;
  description?: string | ReactElement;
  displayName: string;
  groupId: string;
  id: string;
  isCustom: boolean;
  isDefaultValue: boolean;
  isOverridden: boolean;
  isReadOnly: boolean;
  metric?: {
    name?: string;
    type?: UiCounterMetricType;
  };
  name: string;
  options?: {
    values: string[] | number[];
    labels: Record<string, string>;
  };
  order: number | undefined;
  requiresPageReload: boolean;
  savedValue?: V;
  type: T;
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
  options: {
    values: string[] | number[];
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
