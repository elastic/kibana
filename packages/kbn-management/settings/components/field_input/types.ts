/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SettingType } from '@kbn/management-settings-types';
import { ToastsStart } from '@kbn/core-notifications-browser';
import { KnownTypeToValue } from '@kbn/management-settings-types';

/**
 * Contextual services used by a {@link FieldInput} component.
 */
export interface FieldInputServices {
  /**
   * Displays a danger toast message.
   * @param value The message to display.
   */
  showDanger: (value: string) => void;
}

/**
 * An interface containing a collection of Kibana plugins and services required to
 * render this component.
 */
export interface FieldInputKibanaDependencies {
  /** The portion of the {@link ToastsStart} contract used by this component. */
  toasts: Pick<ToastsStart, 'addDanger'>;
}

/**
 * Props passed to a {@link FieldInput} component.
 */
export interface InputProps<T extends SettingType, V = KnownTypeToValue<T> | null> {
  id: string;
  ariaDescribedBy?: string;
  ariaLabel: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
  value?: V;
  name: string;
  /** The `onChange` handler. */
  onChange: OnChangeFn<T>;
}

/**
 * Parameters for the {@link OnChangeFn} handler.
 */
export interface OnChangeParams<T extends SettingType> {
  /** The value provided to the handler. */
  value?: KnownTypeToValue<T> | null;
  /** An error message, if one occurred. */
  error?: string;
  /** True if the format of a change is not valid, false otherwise. */
  isInvalid?: boolean;
}

/**
 * A function that is called when the value of a {@link FieldInput} changes.
 * @param params The {@link OnChangeParams} parameters passed to the handler.
 */
export type OnChangeFn<T extends SettingType> = (params: OnChangeParams<T>) => void;
