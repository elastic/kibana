import { action } from '@storybook/addon-actions';
import React from 'react';
import { CodeEditor } from '@kbn/code-editor';
import { UrlTemplateEditor } from './url_template_editor';

export default {
  title: 'UrlTemplateEditor',
};

export const Default = () => (
  <UrlTemplateEditor
    value={'http://elastic.co/foo/{{event.value}}?foo=bar&test={{json context.panel}}'}
    onChange={action('onChange')}
    Editor={CodeEditor}
  />
);

Default.story = {
  name: 'default',
};

export const WithVariables = () => (
  <UrlTemplateEditor
    value={'http://elastic.co/foo/{{event.value}}?foo=bar&test={{json context.panel}}'}
    variables={[
      {
        label: 'event.value',
      },
      {
        label: 'event.key',
        title: 'Field key.',
        documentation:
          'Field key is Elasticsearch document key as described in Elasticsearch index pattern.',
      },
      {
        label: 'kibanaUrl',
        title: 'Kibana deployment URL.',
        documentation: 'Kibana URL is the link to homepage of Kibana deployment.',
      },
    ]}
    onChange={action('onChange')}
    Editor={CodeEditor}
  />
);

WithVariables.story = {
  name: 'with variables',
};
