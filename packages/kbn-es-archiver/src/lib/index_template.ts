import { merge } from 'lodash';
import type { Client } from '@elastic/elasticsearch';

import { ES_CLIENT_HEADERS } from '../client_headers';

export const getIndexTemplate = async (client: Client, templateName: string) => {
  const { index_templates: indexTemplates } = await client.indices.getIndexTemplate(
    { name: templateName },
    { headers: ES_CLIENT_HEADERS }
  );
  const {
    index_template: { template, composed_of: composedOf = [], ...indexTemplate },
  } = indexTemplates[0];

  const components = await Promise.all(
    composedOf.map(async (component) => {
      const { component_templates: componentTemplates } = await client.cluster.getComponentTemplate(
        { name: component }
      );
      return componentTemplates[0].component_template.template;
    })
  );

  return {
    ...indexTemplate,
    name: templateName,
    template: merge(template, ...components),
  };
};
