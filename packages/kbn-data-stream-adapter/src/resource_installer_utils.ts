/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  IndicesPutIndexTemplateRequest,
  Metadata,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type {
  ClusterPutComponentTemplateRequest,
  IndicesIndexSettings,
  IndicesPutIndexTemplateIndexTemplateMapping,
} from '@elastic/elasticsearch/lib/api/types';
import type { FieldMap } from './field_maps/types';
import { mappingFromFieldMap } from './field_maps/mapping_from_field_map';

interface GetComponentTemplateOpts {
  name: string;
  fieldMap: FieldMap;
  settings?: IndicesIndexSettings;
  dynamic?: 'strict' | boolean;
}

export const getComponentTemplate = ({
  name,
  fieldMap,
  settings,
  dynamic = 'strict',
}: GetComponentTemplateOpts): ClusterPutComponentTemplateRequest => ({
  name,
  _meta: {
    managed: true,
  },
  template: {
    settings: {
      number_of_shards: 1,
      'index.mapping.total_fields.limit':
        Math.ceil(Object.keys(fieldMap).length / 1000) * 1000 + 500,
      ...settings,
    },
    mappings: mappingFromFieldMap(fieldMap, dynamic),
  },
});

interface GetIndexTemplateOpts {
  name: string;
  indexPatterns: string[];
  kibanaVersion: string;
  totalFieldsLimit: number;
  componentTemplateRefs?: string[];
  namespace?: string;
  template?: IndicesPutIndexTemplateIndexTemplateMapping;
  hidden?: boolean;
}

export const getIndexTemplate = ({
  name,
  indexPatterns,
  kibanaVersion,
  totalFieldsLimit,
  componentTemplateRefs,
  namespace = 'default',
  template = {},
  hidden = true,
}: GetIndexTemplateOpts): IndicesPutIndexTemplateRequest => {
  const indexMetadata: Metadata = {
    kibana: {
      version: kibanaVersion,
    },
    managed: true,
    namespace,
  };

  return {
    name,
    body: {
      data_stream: { hidden },
      index_patterns: indexPatterns,
      composed_of: componentTemplateRefs,
      template: {
        ...template,
        settings: {
          hidden,
          auto_expand_replicas: '0-1',
          'index.mapping.ignore_malformed': true,
          'index.mapping.total_fields.limit': totalFieldsLimit,
          ...template.settings,
        },
        mappings: {
          dynamic: false,
          _meta: indexMetadata,
          ...template.mappings,
        },
      },
      _meta: indexMetadata,

      // By setting the priority to namespace.length, we ensure that if one namespace is a prefix of another namespace
      // then newly created indices will use the matching template with the *longest* namespace
      priority: namespace.length,
    },
  };
};
