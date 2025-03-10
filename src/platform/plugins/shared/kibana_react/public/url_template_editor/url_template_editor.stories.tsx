/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import React from 'react';
import { CodeEditor } from '@kbn/code-editor';
import { UrlTemplateEditor } from './url_template_editor';

storiesOf('UrlTemplateEditor', module)
  .add('default', () => (
    <UrlTemplateEditor
      value={'http://elastic.co/foo/{{event.value}}?foo=bar&test={{json context.panel}}'}
      onChange={action('onChange')}
      Editor={CodeEditor}
    />
  ))
  .add('with variables', () => (
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
  ));
