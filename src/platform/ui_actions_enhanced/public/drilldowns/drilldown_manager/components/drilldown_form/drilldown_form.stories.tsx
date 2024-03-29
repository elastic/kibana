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
import { DrilldownForm } from '.';
import type { TriggerPickerProps } from '../trigger_picker';

const triggers: TriggerPickerProps = {
  items: [
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
  ],
  selected: ['RANGE_SELECT_TRIGGER'],
  docs: 'http://example.com',
  onChange: () => {},
};

storiesOf('components/DrilldownForm', module)
  .add('Default', () => {
    return (
      <DrilldownForm name={'...'} triggers={triggers} onNameChange={action('onNameChange')}>
        children...
      </DrilldownForm>
    );
  })
  .add('With license link', () => {
    return (
      <DrilldownForm name={'...'} triggers={triggers} onNameChange={action('onNameChange')}>
        children...
      </DrilldownForm>
    );
  })
  .add('No triggers', () => {
    return (
      <DrilldownForm
        name={'...'}
        triggers={{
          items: [],
          selected: ['RANGE_SELECT_TRIGGER'],
          docs: 'http://example.com',
          onChange: () => {},
        }}
        onNameChange={action('onNameChange')}
      >
        children...
      </DrilldownForm>
    );
  });
