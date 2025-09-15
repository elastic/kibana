/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { merge } from 'lodash';
import type { Client } from '@elastic/elasticsearch';

import type { ToolingLog } from '@kbn/tooling-log';
import { ES_CLIENT_HEADERS } from '../client_headers';

export const getIndexTemplate = async (client: Client, templateName: string, log: ToolingLog) => {
  const { index_templates: indexTemplates } = await client.indices.getIndexTemplate(
    { name: templateName },
    { headers: ES_CLIENT_HEADERS }
  );
  const {
    index_template: {
      template,
      composed_of: composedOf = [],
      ignore_missing_component_templates: ignoreMissingComponentTemplates = [],
      ...indexTemplate
    },
  } = indexTemplates[0];

  const components = await Promise.all(
    composedOf.map(async (component) => {
      try {
        const exists = await client.cluster.existsComponentTemplate({ name: component });
        if (!exists && ignoreMissingComponentTemplates?.includes(component)) {
          // Component template doesn't exist and is marked as ignore missing, skip it
          return null;
        }
        const { component_templates: componentTemplates } =
          await client.cluster.getComponentTemplate({ name: component });
        return componentTemplates[0].component_template.template;
      } catch (error) {
        if (error?.meta?.statusCode === 404) {
          // Component template doesn't exist and is not marked as ignore missing, log a warning and skip it
          if (!ignoreMissingComponentTemplates?.includes(component)) {
            log.warning(
              `Required Component template "${component}" not found in index template "${templateName}"`
            );
            return null;
          }
        }
        throw error;
      }
    })
  );

  return {
    ...indexTemplate,
    name: templateName,
    template: merge(template, ...components.filter(Boolean)),
  };
};
