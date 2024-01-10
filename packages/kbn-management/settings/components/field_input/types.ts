/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  FieldDefinition,
  OnInputChangeFn,
  SettingType,
  UnsavedFieldChange,
} from '@kbn/management-settings-types';
import { ToastsStart } from '@kbn/core-notifications-browser';
import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { ValueValidation } from '@kbn/core-ui-settings-browser/src/types';

/**
 * Contextual services used by a {@link FieldInput} component.
 */
export interface FieldInputServices {
  /**
   * Displays a danger toast message.
   * @param value The message to display.
   */
  showDanger: (value: string) => void;
  validateChange: (key: string, value: any) => Promise<ValueValidation>;
}

/**
 * An interface containing a collection of Kibana plugins and services required to
 * render this component.
 */
export interface FieldInputKibanaDependencies {
  /** The portion of the {@link ToastsStart} contract used by this component. */
  notifications: {
    toasts: Pick<ToastsStart, 'addDanger'>;
  };
  settings: {
    client: IUiSettingsClient;
  };
}

/**
 * Props passed to a {@link FieldInput} component.
 */
export interface InputProps<T extends SettingType> {
  field: Pick<
    FieldDefinition<T>,
    'ariaAttributes' | 'defaultValue' | 'id' | 'name' | 'savedValue' | 'type' | 'isOverridden'
  >;
  unsavedChange?: UnsavedFieldChange<T>;
  isSavingEnabled: boolean;
  /** The `onInputChange` handler. */
  onInputChange: OnInputChangeFn<T>;
}
