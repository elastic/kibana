/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type { FieldTypeKnown, FieldBase } from './types';

export {
  isKnownFieldType,
  KNOWN_FIELD_TYPES,
  KNOWN_FIELD_TYPE_LIST,
} from './src/utils/field_types';

export { getFieldIconType } from './src/utils/get_field_icon_type';
export { getFieldType } from './src/utils/get_field_type';
export { getFieldTypeDescription } from './src/utils/get_field_type_description';
export { getFieldTypeName, UNKNOWN_FIELD_TYPE_MESSAGE } from './src/utils/get_field_type_name';
export {
  fieldNameWildcardMatcher,
  getFieldSearchMatchingHighlight,
} from './src/utils/field_name_wildcard_matcher';

export { FieldIcon, type FieldIconProps, getFieldIconProps } from './src/components/field_icon';
