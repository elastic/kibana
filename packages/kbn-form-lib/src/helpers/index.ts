/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  emptyField,
  maxLengthField,
  minLengthField,
  urlField,
  indexNameField,
  containsCharsField,
  startsWithField,
  indexPatternField,
  lowerCaseStringField,
  isJsonField,
  numberGreaterThanField,
  numberSmallerThanField,
} from './field_validators';
import { toInt } from './field_formatters';
import { multiSelectComponent as multiSelectSerializer, stripEmptyFields } from './serializers';
import { multiSelectComponent as multiSelectDeserializer } from './de_serializers';

export const fieldValidators = {
  emptyField,
  maxLengthField,
  minLengthField,
  urlField,
  indexNameField,
  containsCharsField,
  startsWithField,
  indexPatternField,
  lowerCaseStringField,
  isJsonField,
  numberGreaterThanField,
  numberSmallerThanField,
};

export const fieldFormatters = {
  toInt,
};
export const deserializers = {
  multiSelectDeserializer,
};
export const serializers = {
  multiSelectSerializer,
  stripEmptyFields,
};
