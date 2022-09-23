/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { storiesOf } from '@storybook/react';
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

storiesOf('components/TriggerPicker', module)
  .add('Default', () => {
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
  })
  .add('With docs', () => {
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
  })
  .add('Selected trigger', () => {
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
  })
  .add('Interactive', () => {
    return <Demo />;
  });
