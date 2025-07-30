/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { ESQL_CONTROL } from '@kbn/controls-constants';
import { ESQLVariableType, EsqlControlType } from '@kbn/esql-types';
import { baseControlSchema, deprecatedDefaultControlState } from './control_schema';

export const esqlControlState = deprecatedDefaultControlState.extends({
  title: schema.string(),
  availableOptions: schema.arrayOf(schema.string()),
  selectedOptions: schema.arrayOf(schema.string()),
  variableName: schema.string(),
  variableType: schema.oneOf(
    [
      schema.literal(ESQLVariableType.TIME_LITERAL),
      schema.literal(ESQLVariableType.FIELDS),
      schema.literal(ESQLVariableType.VALUES),
      schema.literal(ESQLVariableType.FUNCTIONS),
    ],
    {
      meta: { description: 'The type of the variable.' },
    }
  ),
  esqlQuery: schema.string(),
  controlType: schema.oneOf(
    [
      schema.literal(EsqlControlType.STATIC_VALUES),
      schema.literal(EsqlControlType.VALUES_FROM_QUERY),
    ],
    {
      meta: { description: 'The type of the ES|QL control.' },
    }
  ),
});

export const esqlControl = baseControlSchema.extends({
  type: schema.literal(ESQL_CONTROL),
  controlConfig: esqlControlState,
});
