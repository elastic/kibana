/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { action } from '@storybook/addon-actions';

import { DashboardPicker } from './dashboard_picker';

export default {
  component: DashboardPicker,
  title: 'Dashboard Picker',
  argTypes: {
    isDisabled: {
      control: 'boolean',
      defaultValue: false,
    },
  },
};

export const Example = ({ isDisabled }: { isDisabled: boolean }) => (
  <DashboardPicker onChange={action('onChange')} isDisabled={isDisabled} />
);
