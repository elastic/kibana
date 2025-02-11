/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiSelectableOption } from '@elastic/eui';

import { ValidationFunc, ValidationError } from '../../hook_form_lib';
import { hasMinLengthArray } from '../../../validators/array';
import { multiSelectComponent } from '../serializers';
import { ERROR_CODE } from './types';

const { optionsToSelectedValue } = multiSelectComponent;

/**
 * Validator to validate that a EuiSelectable has a minimum number
 * of items selected.
 * @param total Minimum number of items
 */
export const minSelectableSelectionField =
  ({
    total = 0,
    message,
  }: {
    total: number;
    message: string | ((err: Partial<ValidationError>) => string);
  }) =>
  (...args: Parameters<ValidationFunc>): ReturnType<ValidationFunc<any, ERROR_CODE>> => {
    const [{ value }] = args;

    // We need to convert all the options from the multi selectable component, to the
    // an actual Array of selection _before_ validating the Array length.
    return hasMinLengthArray(total)(optionsToSelectedValue(value as EuiSelectableOption[]))
      ? undefined
      : {
          code: 'ERR_MIN_SELECTION',
          total,
          message: typeof message === 'function' ? message({ length }) : message,
        };
  };
