/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { BehaviorSubject, of } from 'rxjs';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { StoryObj } from '@storybook/react';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { kqlPluginMock } from '@kbn/kql/public/mocks';
import { ESQLEditor } from '../esql_editor';
import type { ESQLEditorProps } from '../esql_editor';

const uiConfig: Record<string, unknown> = {};
const uiSettings = {
  get: (key: string) => uiConfig[key],
};

const core = coreMock.createStart();
core.chrome.getActiveSolutionNavId$.mockReturnValue(new BehaviorSubject<'oblt' | null>('oblt'));
(core.http.get as jest.Mock).mockImplementation(async (path: string) => {
  if (path.includes('/internal/esql/autocomplete/sources/')) {
    return [
      { name: 'test_index', hidden: false, type: 'index' },
      { name: 'logs', hidden: false, type: 'index' },
    ];
  }
  return [];
});

const kql = kqlPluginMock.createStartContract();
(kql.autocomplete.hasQuerySuggestions as jest.Mock).mockReturnValue(true);

const storage = {
  get: (key: string) => null,
  set: (_key: string, _value: unknown) => {},
  remove: (_key: string) => {},
  clear: () => {},
};

const uiActions = {
  getTrigger: (_id: string) => ({
    exec: async () => {},
  }),
};

const data = dataPluginMock.createStartContract();
(data.search.search as jest.Mock).mockReturnValue(
  of({
    rawResponse: { columns: [], all_columns: [] },
    isPartial: false,
    isRunning: false,
    total: 0,
    loaded: 0,
  })
);

const services = {
  core,
  application: core.application,
  uiSettings,
  settings: { client: uiSettings },
  data,
  kql,
  storage,
  uiActions,
};

const StoryWrapper = ({ args }: { args: ESQLEditorProps }) => {
  const stableServices = useMemo(() => services, []);
  return (
    <KibanaContextProvider services={stableServices}>
      <ESQLEditor {...args} />
    </KibanaContextProvider>
  );
};

const Template = (args: ESQLEditorProps) => <StoryWrapper args={args} />;

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
    hideQueryHistory: true,
    disableAutoFocus: true,
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
    hideQueryHistory: true,
    disableAutoFocus: true,
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
