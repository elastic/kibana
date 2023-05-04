/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mapValues, isString } from 'lodash';
import { ES_FIELD_TYPES } from '@kbn/data-plugin/public';
import { FieldMappingSpec, MappingObject } from './types';

// import from ./common/types to prevent circular dependency of kibana_utils <-> data plugin

/** @private */
type ShorthandFieldMapObject = FieldMappingSpec | ES_FIELD_TYPES | 'json';

/** @public */
export const expandShorthand = (sh: Record<string, ShorthandFieldMapObject>): MappingObject => {
  return mapValues(sh, (val: ShorthandFieldMapObject) => {
    const fieldMap = isString(val) ? { type: val } : val;
    const json: FieldMappingSpec = {
      type: ES_FIELD_TYPES.TEXT,
      _serialize(v) {
        if (v) return JSON.stringify(v);
      },
      _deserialize(v) {
        if (v) return JSON.parse(v);
      },
    };

    return fieldMap.type === 'json' ? json : fieldMap;
  }) as MappingObject;
};
