/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { StoryObj } from '@storybook/react';
import { ESQLEditor } from '../esql_editor';
import type { ESQLEditorProps } from '../types';

const Template = (args: ESQLEditorProps) => (
  <KibanaContextProvider
    services={{
      settings: { client: { get: () => {} } },
      uiSettings: { get: () => {} },
      data: { query: { timefilter: { timefilter: { getTime: () => {} } } } },
    }}
  >
    <ESQLEditor {...args} />
  </KibanaContextProvider>
);

export default {
  title: 'Text based languages editor',
  component: ESQLEditor,
};

export const ExpandedMode: StoryObj<typeof ESQLEditor> = {
  render: Template,
  name: 'expanded mode',

  args: {
    query: {
      esql: 'from dataview | keep field1, field2',
    },
  },

  argTypes: {
    onTextLangQueryChange: {
      action: 'changed',
    },

    onTextLangQuerySubmit: {
      action: 'submitted',
    },
  },
};

export const WithErrors: StoryObj<typeof ESQLEditor> = {
  render: Template,
  name: 'with errors',

  args: {
    query: {
      esql: 'from dataview | keep field1, field2',
    },

    dataTestSubj: 'test-id',

    errors: [
      new Error(
        '[essql] > Unexpected error from Elasticsearch: verification_exception - Found 1 problem line 1:16: Unknown column [field10]'
      ),
    ],
  },

  argTypes: {
    onTextLangQueryChange: {
      action: 'changed',
    },

    onTextLangQuerySubmit: {
      action: 'submitted',
    },
  },
};
