/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import React from 'react';
import { UrlTemplateEditor } from './url_template_editor';

storiesOf('UrlTemplateEditor', module)
  .add('default', () => (
    <UrlTemplateEditor
      initialValue={'http://elastic.co/{{event.value}}'}
      onChange={action('onChange')}
    />
  ))
  .add('with variables', () => (
    <UrlTemplateEditor
      initialValue={'http://elastic.co/{{event.value}}'}
      variables={[
        {
          label: 'event.value',
        },
        {
          label: 'event.key',
          description: 'Field key.',
          documentation:
            'Field key is Elasticsearch document key as described in Elasticsearch index pattern.',
        },
        {
          label: 'kibanaUrl',
          description: 'Kibana deployment URL.',
          documentation: 'Kibana URL is the link to homepage of Kibana deployment.',
        },
      ]}
      onChange={action('onChange')}
    />
  ));
