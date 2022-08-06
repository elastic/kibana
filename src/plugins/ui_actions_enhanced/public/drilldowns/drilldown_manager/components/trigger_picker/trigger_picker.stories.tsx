/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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

export const WithDocs = () => {
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
};

WithDocs.story = {
  name: 'With docs',
};

export const SelectedTrigger = () => {
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
};

SelectedTrigger.story = {
  name: 'Selected trigger',
};

export const Interactive = () => {
  return <Demo />;
};
