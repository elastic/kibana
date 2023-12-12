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
  IndicesPutIndexTemplateIndexTemplateMapping,
} from '@elastic/elasticsearch/lib/api/types';
import type { FieldMap } from './field_maps/types';
import { getComponentTemplateFromFieldMap } from './field_maps/component_template_from_field_map';

interface GetComponentTemplateOpts {
  name: string;
  fieldMap: FieldMap;
  dynamic?: 'strict' | boolean;
  includeSettings?: boolean;
}

export const getComponentTemplate = ({
  fieldMap,
  name,
  dynamic,
  includeSettings,
}: GetComponentTemplateOpts): ClusterPutComponentTemplateRequest =>
  getComponentTemplateFromFieldMap({
    name,
    fieldMap,
    dynamic,
    includeSettings,
  });

interface GetIndexTemplateOpts {
  name: string;
  indexPatterns: string[];
  componentTemplateRefs: string[];
  kibanaVersion: string;
  namespace: string;
  totalFieldsLimit: number;
  template?: IndicesPutIndexTemplateIndexTemplateMapping;
}

export const getIndexTemplate = ({
  name,
  indexPatterns,
  componentTemplateRefs,
  kibanaVersion,
  namespace,
  totalFieldsLimit,
  template = {},
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
      data_stream: { hidden: true },
      index_patterns: indexPatterns,
      composed_of: componentTemplateRefs,
      template: {
        ...template,
        settings: {
          auto_expand_replicas: '0-1',
          hidden: true,
          'index.mapping.ignore_malformed': true,
          'index.mapping.total_fields.limit': totalFieldsLimit,
          ...template.settings,
        },
        mappings: {
          dynamic: false,
          _meta: indexMetadata,
          ...template.mappings,
        },
        lifecycle: {
          data_retention: '7d',
          ...template.lifecycle,
        },
      },
      _meta: indexMetadata,

      // By setting the priority to namespace.length, we ensure that if one namespace is a prefix of another namespace
      // then newly created indices will use the matching template with the *longest* namespace
      priority: namespace.length,
    },
  };
};
