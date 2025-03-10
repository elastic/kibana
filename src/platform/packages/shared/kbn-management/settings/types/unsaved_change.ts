/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { KnownTypeToValue, SettingType } from './setting_type';

/**
 * A {@link UnsavedFieldChange} represents local changes to a field that have not
 * yet been saved.
 * @public
 */
export interface UnsavedFieldChange<T extends SettingType = SettingType> {
  /**
   * The type of setting.
   * @see {@link SettingType}
   */
  type: T;
  /** An error message, if any, from the change. */
  error?: string | null;
  /** True if the change is invalid for the field, false otherwise. */
  isInvalid?: boolean;
  /** The current unsaved value stored in the field. */
  unsavedValue?: KnownTypeToValue<T> | null;
}

/**
 * This is a {@link UnsavedFieldChange} representing an unsaved change to a
 * {@link FieldDefinition} which has a {@link UiSetting} `number` value
 * for use in the UI.
 * @public
 */
export type ArrayUnsavedFieldChange = UnsavedFieldChange<'array'>;

/**
 * This is a {@link UnsavedFieldChange} representing an unsaved change to a
 * {@link FieldDefinition} which has a {@link UiSetting} `boolean` value
 * for use in the UI.
 * @public
 */
export type BooleanUnsavedFieldChange = UnsavedFieldChange<'boolean'>;

/**
 * This is a {@link UnsavedFieldChange} representing an unsaved change to a
 * {@link FieldDefinition} which has a {@link UiSetting} `color` value
 * for use in the UI.
 * @public
 */
export type ColorUnsavedFieldChange = UnsavedFieldChange<'color'>;

/**
 * This is a {@link UnsavedFieldChange} representing an unsaved change to a
 * {@link FieldDefinition} which has a {@link UiSetting} `image` value
 * for use in the UI.
 * @public
 */
export type ImageUnsavedFieldChange = UnsavedFieldChange<'image'>;

/**
 * This is a {@link UnsavedFieldChange} representing an unsaved change to a
 * {@link FieldDefinition} which has a {@link UiSetting} `json` value
 * for use in the UI.
 * @public
 */
export type JsonUnsavedFieldChange = UnsavedFieldChange<'json'>;

/**
 * This is a {@link UnsavedFieldChange} representing an unsaved change to a
 * {@link FieldDefinition} which has a {@link UiSetting} `markdown` value
 * for use in the UI.
 * @public
 */
export type MarkdownUnsavedFieldChange = UnsavedFieldChange<'markdown'>;

/**
 * This is a {@link UnsavedFieldChange} representing an unsaved change to a
 * {@link FieldDefinition} which has a {@link UiSetting} `number` value
 * for use in the UI.
 * @public
 */
export type NumberUnsavedFieldChange = UnsavedFieldChange<'number'>;

/**
 * This is a {@link UnsavedFieldChange} representing an unsaved change to a
 * {@link FieldDefinition} which has a {@link UiSetting} `select` value
 * for use in the UI.
 * @public
 */
export type SelectUnsavedFieldChange = UnsavedFieldChange<'select'>;

/**
 * This is a {@link UnsavedFieldChange} representing an unsaved change to a
 * {@link FieldDefinition} which has a {@link UiSetting} `string` value
 * for use in the UI.
 * @public
 */
export type StringUnsavedFieldChange = UnsavedFieldChange<'string'>;

/**
 * This is a {@link UnsavedFieldChange} representing an unsaved change to a
 * {@link FieldDefinition} which has a {@link UiSetting} `undefined` value
 * for use in the UI.
 * @public
 */
export type UndefinedUnsavedFieldChange = UnsavedFieldChange<'undefined'>;

// prettier-ignore
/**
 * This is a narrowing type, which finds the correct primitive type based on a
 * given {@link SettingType}.
 * @public
 */
export type KnownTypeToUnsavedChange<T extends SettingType> =
  T extends 'array' ? ArrayUnsavedFieldChange :
  T extends 'boolean' ? BooleanUnsavedFieldChange :
  T extends 'color' ? ColorUnsavedFieldChange :
  T extends 'image' ? ImageUnsavedFieldChange :
  T extends 'json' ? JsonUnsavedFieldChange :
  T extends 'markdown' ? MarkdownUnsavedFieldChange :
  T extends 'number' | 'bigint' ? NumberUnsavedFieldChange :
  T extends 'select' ? SelectUnsavedFieldChange :
  T extends 'string' ? StringUnsavedFieldChange:
  T extends 'undefined' ? UndefinedUnsavedFieldChange :
  never;

export type UnsavedFieldChanges = Record<string, UnsavedFieldChange>;
