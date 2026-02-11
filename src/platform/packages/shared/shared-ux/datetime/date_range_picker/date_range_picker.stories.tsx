/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';

import {
  DateRangePicker,
  type DateRangePickerProps,
  type DateRangePickerOnChangeProps,
} from './date_range_picker';

const meta: Meta<DateRangePickerProps> = {
  title: 'Date Time/DateRangePicker',
  component: DateRangePicker,
  argTypes: {
    onChange: { action: 'onChange' },
  },
  args: {
    onChange: action('onChange'),
  },
};

export default meta;
type Story = StoryObj<DateRangePickerProps>;

export const Playground: Story = {
  args: {
    defaultValue: 'last 20 minutes',
  },
  render: (args) => <StatefulDateRangePicker {...args} />,
};

function StatefulDateRangePicker(props: DateRangePickerProps) {
  const [invalid, setInvalid] = useState<boolean>(false);
  const { onChange, ...rest } = props;

  const handleOnChange = (args: DateRangePickerOnChangeProps) => {
    setInvalid(args.isInvalid);
    onChange?.(args);
  };

  return <DateRangePicker isInvalid={invalid} {...rest} onChange={handleOnChange} />;
}
