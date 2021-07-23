/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// TODO: I have to use any here for now, but once this is available below, we should use the correct types, https://github.com/elastic/kibana/issues/105731
// import { IFieldType } from '../../../../../../../src/plugins/data/common';
type IFieldType = any;

import {
  EXCEPTION_OPERATORS,
  OperatorOption,
  doesNotExistOperator,
  existsOperator,
  isNotOperator,
  isOperator,
} from '@kbn/securitysolution-list-utils';

/**
 * Returns the appropriate operators given a field type
 *
 * @param field IFieldType selected field
 *
 */
export const getOperators = (field: IFieldType | undefined): OperatorOption[] => {
  if (field == null) {
    return [isOperator];
  } else if (field.type === 'boolean') {
    return [isOperator, isNotOperator, existsOperator, doesNotExistOperator];
  } else if (field.type === 'nested') {
    return [isOperator];
  } else {
    return EXCEPTION_OPERATORS;
  }
};
