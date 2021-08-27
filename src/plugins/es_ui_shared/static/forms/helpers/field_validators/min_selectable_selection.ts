/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { EuiSelectableOption } from '@elastic/eui';
import { hasMinLengthArray } from '../../../validators/array/has_min_length';
import type { ValidationError, ValidationFunc } from '../../hook_form_lib/types';
import { multiSelectComponent } from '../serializers';
import type { ERROR_CODE } from './types';

const { optionsToSelectedValue } = multiSelectComponent;

/**
 * Validator to validate that a EuiSelectable has a minimum number
 * of items selected.
 * @param total Minimum number of items
 */
export const minSelectableSelectionField = ({
  total = 0,
  message,
}: {
  total: number;
  message: string | ((err: Partial<ValidationError>) => string);
}) => (...args: Parameters<ValidationFunc>): ReturnType<ValidationFunc<any, ERROR_CODE>> => {
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
