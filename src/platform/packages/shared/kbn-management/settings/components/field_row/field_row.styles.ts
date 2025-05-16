/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { UnsavedFieldChange, FieldDefinition, SettingType } from '@kbn/management-settings-types';
import { hasUnsavedChange } from '@kbn/management-settings-utilities';

/**
 * Parameters for the {@link useFieldStyles} hook.
 */
export interface Params<T extends SettingType> {
  /** The {@link FieldDefinition} corresponding the setting. */
  field: Pick<FieldDefinition<T>, 'savedValue'>;
  /** The {@link UnsavedFieldChange} corresponding to any unsaved change to the field. */
  unsavedChange?: UnsavedFieldChange<T>;
}

/**
 * A React hook that provides stateful `css` classes for the {@link FieldRow} component.
 */
export const useFieldStyles = <T extends SettingType>({ field, unsavedChange }: Params<T>) => {
  const {
    euiTheme: { size, colors },
  } = useEuiTheme();

  const unsaved = hasUnsavedChange(field, unsavedChange);
  const error = unsavedChange?.error;

  return {
    cssFieldFormGroup: css`
      + * {
        margin-top: ${size.base};
      }
    `,
    cssFieldTitle: css`
      font-weight: bold;
      padding-left: ${size.s};
      margin-left: -${size.s};

      ${unsaved ? `box-shadow: -${size.xs} 0 ${colors.warning};` : ''}

      ${error ? `box-shadow: -${size.xs} 0 ${colors.danger};` : ''}
    `,
    cssDescription: css`
      & > div {
        margin-bottom: ${size.s};
      }
    `,
  };
};
