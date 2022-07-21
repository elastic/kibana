/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';
import { EuiForm } from '@elastic/eui';
import { ComponentStory } from '@storybook/react';
import { DataView } from '@kbn/data-views-plugin/common';
import { FiltersEditor, FiltersEditorProps } from '../filters_editor';

export default {
  title: 'Filters Editor',
  component: FiltersEditor,
  decorators: [(story: Function) => <EuiForm>{story()}</EuiForm>],
};

const Template: ComponentStory<FC<FiltersEditorProps>> = (args) => <FiltersEditor {...args} />;

export const Default = Template.bind({});

const mockedDataView = {
  id: '1234',
  title: 'logstash-*',
  fields: [
    {
      name: 'response',
      type: 'number',
      esTypes: ['integer'],
      aggregatable: true,
      filterable: true,
      searchable: true,
    },
  ],
} as DataView;

Default.args = {
  filters: [],
  dataView: mockedDataView,
  onChange: (filters) => {},
};
