/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';

import {
  DateRangePicker,
  type DateRangePickerProps,
  type DateRangePickerOnChangeProps,
} from './date_range_picker';
import type { TimeRangeBoundsOption } from './types';

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
    presets: [
      { start: 'now-15m', end: 'now', label: 'Last 15 minutes' },
      { start: 'now-30m', end: 'now', label: 'Last 30 minutes' },
      { start: 'now-1h', end: 'now', label: 'Last 1 hour' },
      { start: 'now/d', end: 'now/d', label: 'Today' },
      { start: 'now-1d/d', end: 'now-1d/d', label: 'Yesterday' },
      { start: 'now-24h', end: 'now', label: 'Last 24 hours' },
      { start: 'now-30d', end: 'now', label: 'Last 30 days' },
      { start: 'now-3M', end: 'now', label: 'Last 3 months' },
      { start: 'now-1y', end: 'now', label: 'Last 1 year' },
    ],
  },
  render: (args) => <StatefulDateRangePicker {...args} />,
};

export const Presets: Story = {
  args: {
    defaultValue: 'last 20 minutes',
    presets: [
      { start: 'now-15m', end: 'now', label: 'Last 15 minutes' },
      { start: 'now-1h', end: 'now', label: 'Last 1 hour' },
      { start: 'now/d', end: 'now/d', label: 'Today' },
    ],
    onPresetSave: action('onPresetSave'),
    onPresetDelete: action('onPresetDelete'),
  },
  render: (args) => <StatefulDateRangePicker {...args} />,
};

function StatefulDateRangePicker(props: DateRangePickerProps) {
  const [invalid, setInvalid] = useState<boolean>(false);
  const [recents, setRecents] = useState<TimeRangeBoundsOption[]>([]);
  const [presets, setPresets] = useState<TimeRangeBoundsOption[]>(props.presets ?? []);
  const { onChange, onPresetSave, onPresetDelete, ...rest } = props;

  const handleOnChange = (args: DateRangePickerOnChangeProps) => {
    setInvalid(args.isInvalid);

    if (!args.isInvalid) {
      setRecents((prev) => {
        const key = `${args.start}|${args.end}`;
        const deduped = prev.filter((r) => `${r.start}|${r.end}` !== key);
        return [{ start: args.start, end: args.end }, ...deduped].slice(0, 10);
      });
    }

    onChange?.(args);
  };

  const handlePresetSave = useCallback(
    (option: TimeRangeBoundsOption) => {
      onPresetSave?.(option);
      setPresets((prev) => {
        const key = `${option.start}|${option.end}`;
        const deduped = prev.filter((p) => `${p.start}|${p.end}` !== key);
        return [...deduped, option];
      });
    },
    [onPresetSave]
  );

  const handlePresetDelete = useCallback(
    (option: TimeRangeBoundsOption) => {
      onPresetDelete?.(option);
      setPresets((prev) => {
        const key = `${option.start}|${option.end}`;
        return prev.filter((p) => `${p.start}|${p.end}` !== key);
      });
    },
    [onPresetDelete]
  );

  return (
    <DateRangePicker
      isInvalid={invalid}
      recent={recents}
      {...rest}
      presets={presets}
      onChange={handleOnChange}
      onPresetSave={onPresetSave ? handlePresetSave : undefined}
      onPresetDelete={onPresetDelete ? handlePresetDelete : undefined}
    />
  );
}
