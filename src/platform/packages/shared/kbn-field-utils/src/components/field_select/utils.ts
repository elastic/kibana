/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { KBN_FIELD_TYPES, esFieldTypeToKibanaFieldType } from '@kbn/field-types';
import { getTextBasedColumnIconType } from '../../utils/get_text_based_column_icon_type';
import { getFieldTypeName } from '../../utils/get_field_type_name';

export const TYPE_GROUPS: { label: string; types: string[] }[] = [
  {
    label: i18n.translate('fieldUtils.fieldTypeSelect.group.text', {
      defaultMessage: 'Text',
    }),
    types: [
      'text',
      'keyword',
      'constant_keyword',
      'wildcard',
      'match_only_text',
      'search_as_you_type',
      'semantic_text',
    ],
  },
  {
    label: i18n.translate('fieldUtils.fieldTypeSelect.group.numeric', {
      defaultMessage: 'Numeric',
    }),
    types: [
      'byte',
      'double',
      'float',
      'half_float',
      'integer',
      'long',
      'short',
      'unsigned_long',
      'histogram',
    ],
  },
  {
    label: i18n.translate('fieldUtils.fieldTypeSelect.group.booleanDate', {
      defaultMessage: 'Boolean & Date',
    }),
    types: ['boolean', 'date', 'date_nanos'],
  },
  {
    label: i18n.translate('fieldUtils.fieldTypeSelect.group.ipGeo', {
      defaultMessage: 'IP & Geo',
    }),
    types: ['ip', 'geo_point', 'geo_shape'],
  },
  {
    label: i18n.translate('fieldUtils.fieldTypeSelect.group.object', {
      defaultMessage: 'Object',
    }),
    types: ['flattened'],
  },
  {
    label: i18n.translate('fieldUtils.fieldTypeSelect.group.range', {
      defaultMessage: 'Range',
    }),
    types: ['integer_range', 'float_range', 'long_range', 'ip_range', 'double_range', 'date_range'],
  },
  {
    label: i18n.translate('fieldUtils.fieldTypeSelect.group.advanced', {
      defaultMessage: 'Advanced',
    }),
    types: [
      'version',
      'rank_feature',
      'rank_features',
      'dense_vector',
      'sparse_vector',
      'binary',
      'percolator',
    ],
  },
];

/**
 * Gets the field type name, if its not registered transform the field type into readable text.
 */
export const getFieldLabel = (type: string) => {
  const fieldTypeName = getFieldTypeName(type);
  if (fieldTypeName === type) {
    return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
  }
  return fieldTypeName;
};

export const getFieldIconType = (type: string): string => {
  const fieldIconType = getTextBasedColumnIconType({ type: KBN_FIELD_TYPES.UNKNOWN, esType: type });
  if (fieldIconType && fieldIconType !== KBN_FIELD_TYPES.UNKNOWN) {
    return fieldIconType;
  }
  const kibanaFieldType = esFieldTypeToKibanaFieldType(type);
  return kibanaFieldType === KBN_FIELD_TYPES.UNKNOWN ? type : kibanaFieldType;
};
