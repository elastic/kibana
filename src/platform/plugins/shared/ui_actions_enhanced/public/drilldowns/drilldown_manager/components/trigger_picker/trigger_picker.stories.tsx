/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as React from 'react';
import { action } from '@storybook/addon-actions';
import { TriggerPicker } from '.';

const Demo: React.FC = () => {
  const [triggers, setTriggers] = React.useState<string[]>(['RANGE_SELECT_TRIGGER']);

  return (
    <TriggerPicker
      docs={'http://example.com'}
      items={[
        {
          id: 'RANGE_SELECT_TRIGGER',
          title: 'Range selected',
          description: 'On chart brush.',
        },
        {
          id: 'VALUE_CLICK_TRIGGER',
          title: 'Value click',
          description: 'On point click in chart',
        },
      ]}
      selected={triggers}
      onChange={setTriggers}
    />
  );
};

export default {
  title: 'components/TriggerPicker',
};

export const Default = () => {
  return (
    <TriggerPicker
      items={[
        {
          id: 'RANGE_SELECT_TRIGGER',
          title: 'Range selected',
          description: 'On chart brush.',
        },
        {
          id: 'VALUE_CLICK_TRIGGER',
          title: 'Value click',
          description: 'On point click in chart',
        },
      ]}
      selected={[]}
      onChange={action('onChange')}
    />
  );
};

export const WithDocs = {
  render: () => {
    return (
      <TriggerPicker
        docs={'http://example.com'}
        items={[
          {
            id: 'RANGE_SELECT_TRIGGER',
            title: 'Range selected',
            description: 'On chart brush.',
          },
          {
            id: 'VALUE_CLICK_TRIGGER',
            title: 'Value click',
            description: 'On point click in chart',
          },
        ]}
        selected={[]}
        onChange={action('onChange')}
      />
    );
  },

  name: 'With docs',
};

export const SelectedTrigger = {
  render: () => {
    return (
      <TriggerPicker
        docs={'http://example.com'}
        items={[
          {
            id: 'RANGE_SELECT_TRIGGER',
            title: 'Range selected',
            description: 'On chart brush.',
          },
          {
            id: 'VALUE_CLICK_TRIGGER',
            title: 'Value click',
            description: 'On point click in chart',
          },
        ]}
        selected={['VALUE_CLICK_TRIGGER']}
        onChange={action('onChange')}
      />
    );
  },

  name: 'Selected trigger',
};

export const Interactive = () => {
  return <Demo />;
};
