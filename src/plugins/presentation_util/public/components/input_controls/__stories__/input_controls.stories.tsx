/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { action } from '@storybook/addon-actions';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Selectable1A } from '../selectable1a';
import { Selectable1B } from '../selectable1b';

import { decorators } from './decorators';
import { getEuiSelectableOptions, FlightField, flightFieldLabels, flightFields } from './flights';

export default {
  title: 'Input Controls',
  description: '',
  decorators,
};

const storybookArgs = {
  fields: ['OriginCityName', 'OriginWeather', 'DestCityName', 'DestWeather'],
};

const storybookArgTypes = {
  fields: {
    control: {
      type: 'check',
      options: flightFields,
    },
  },
};

export const Option1a = ({ fields }: { fields: FlightField[] }) => (
  <EuiFlexGroup alignItems="center" gutterSize="s">
    {fields.map((field) => (
      <EuiFlexItem grow={false} key={field}>
        <Selectable1A
          onChange={action('onChange')}
          options={getEuiSelectableOptions(field)}
          label={flightFieldLabels[field]}
        />
      </EuiFlexItem>
    ))}
  </EuiFlexGroup>
);

export const Option1b = ({ fields }: { fields: FlightField[] }) => (
  <EuiFlexGroup alignItems="center" gutterSize="s" wrap={true}>
    {fields.map((field) => (
      <EuiFlexItem key={field} style={{ width: '33%' }}>
        <Selectable1B
          onChange={action('onChange')}
          options={getEuiSelectableOptions(field)}
          label={flightFieldLabels[field]}
        />
      </EuiFlexItem>
    ))}
  </EuiFlexGroup>
);

Option1a.args = storybookArgs;
Option1a.argTypes = storybookArgTypes;
Option1b.args = storybookArgs;
Option1b.argTypes = storybookArgTypes;
