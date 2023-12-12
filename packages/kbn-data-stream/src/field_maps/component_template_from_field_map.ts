/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ClusterPutComponentTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import type { FieldMap } from './types';
import { mappingFromFieldMap } from './mapping_from_field_map';

export interface GetComponentTemplateFromFieldMapOpts {
  name: string;
  fieldMap: FieldMap;
  includeSettings?: boolean;
  dynamic?: 'strict' | boolean;
}
export const getComponentTemplateFromFieldMap = ({
  name,
  fieldMap,
  dynamic,
  includeSettings,
}: GetComponentTemplateFromFieldMapOpts): ClusterPutComponentTemplateRequest => {
  return {
    name,
    _meta: {
      managed: true,
    },
    template: {
      settings: {
        ...(includeSettings
          ? {
              number_of_shards: 1,
              'index.mapping.total_fields.limit':
                Math.ceil(Object.keys(fieldMap).length / 1000) * 1000 + 500,
            }
          : {}),
      },

      mappings: mappingFromFieldMap(fieldMap, dynamic ?? 'strict'),
    },
  };
};
