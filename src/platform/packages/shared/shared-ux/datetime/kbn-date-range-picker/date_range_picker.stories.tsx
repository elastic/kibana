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
import { fn } from '@storybook/test';

import {
  DateRangePicker,
  type DateRangePickerProps,
  type DateRangePickerOnChangeProps,
} from './date_range_picker';
import type { DateRangePickerSettings, TimeRangeBoundsOption } from './types';

const meta: Meta<DateRangePickerProps> = {
  title: 'Date Time/DateRangePicker',
  component: DateRangePicker,
  args: {
    onChange: action('onChange'),
    onInputChange: action('onInputChange'),
    onSettingsChange: action('onSettingsChange'),
    settings: { roundRelativeTime: true, timePrecision: 's' },
  },
  argTypes: {
    locale: {
      control: 'select',
      options: ['en', 'de-DE', 'fr-FR', 'ja-JP', 'zh-CN'],
      description: 'English input always parses, whichever locale is active.',
    },
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
      { start: 'now-24h/h', end: 'now', label: 'Last 24 hours' },
      { start: 'now-30d/d', end: 'now', label: 'Last 30 days' },
      { start: 'now-3M', end: 'now', label: 'Last 3 months' },
      { start: 'now-1y', end: 'now', label: 'Last 1 year' },
    ],
    timeZone: 'Browser',
  },
  render: (args) => <StatefulDateRangePicker {...args} />,
};

/**
 * Presets labelled in each supported locale, so switching `locale` exercises
 * the preset-label round-trip (a label only renders in the input when it
 * parses as natural language under the active grammar).
 */
const LOCALIZED_PRESETS: Record<string, TimeRangeBoundsOption[]> = {
  en: [
    { start: 'now-15m', end: 'now', label: 'Last 15 minutes' },
    { start: 'now-7d', end: 'now', label: 'Last 7 days' },
    { start: 'now/d', end: 'now/d', label: 'Today' },
  ],
  'de-DE': [
    { start: 'now-15m', end: 'now', label: 'Letzte 15 Minuten' },
    { start: 'now-7d', end: 'now', label: 'Letzte 7 Tage' },
    { start: 'now/d', end: 'now/d', label: 'Heute' },
  ],
  'fr-FR': [
    { start: 'now-15m', end: 'now', label: 'Dernières 15 minutes' },
    { start: 'now-7d', end: 'now', label: 'Derniers 7 jours' },
    { start: 'now/d', end: 'now/d', label: "Aujourd'hui" },
  ],
  'ja-JP': [
    { start: 'now-15m', end: 'now', label: '過去15分間' },
    { start: 'now-7d', end: 'now', label: '過去7日間' },
    { start: 'now/d', end: 'now/d', label: '今日' },
  ],
  'zh-CN': [
    { start: 'now-15m', end: 'now', label: '最近 15 分钟' },
    { start: 'now-7d', end: 'now', label: '最近 7 天' },
    { start: 'now/d', end: 'now/d', label: '今天' },
  ],
};

/**
 * Localization playground: pick a `locale` in the Controls panel and type in
 * that language (presets are labelled in the active locale too). The picker
 * remounts on locale switch so presets and internal state stay in sync.
 */
export const Localized: Story = {
  args: {
    defaultValue: 'last 15 minutes',
    locale: 'zh-CN',
    timeZone: 'Browser',
  },
  render: (args) => (
    <StatefulDateRangePicker
      key={args.locale}
      {...args}
      presets={LOCALIZED_PRESETS[args.locale ?? 'en'] ?? []}
    />
  ),
};

export const Presets: Story = {
  args: {
    defaultValue: 'last 20 minutes',
    presets: [
      { start: 'now-15m', end: 'now', label: 'Last 15 minutes' },
      { start: 'now-1h', end: 'now', label: 'Last 1 hour' },
      { start: 'now/d', end: 'now/d', label: 'Today' },
    ],
    timeZone: 'Europe/Amsterdam',
    onPresetSave: action('onPresetSave'),
    onPresetDelete: action('onPresetDelete'),
  },
  render: (args) => <StatefulDateRangePicker {...args} />,
};

/** `onRefresh` + `settings.autoRefresh`: Settings refresh row, input append when `isEnabled`, timer when unpaused. */
export const AutoRefresh: Story = {
  args: {
    defaultValue: 'last 15 minutes',
    settings: {
      roundRelativeTime: true,
      timePrecision: 's',
      autoRefresh: {
        isEnabled: true,
        isPaused: false,
        intervalMs: 60_000,
        intervalDisplayUnit: 's',
      },
    },
    showTimeWindowButtons: true,
    timeZone: 'Europe/Amsterdam',
    onRefresh: fn(),
  },
  render: (args) => <StatefulDateRangePicker {...args} />,
};

export const Collapsed: Story = {
  args: {
    defaultValue: 'last 15 minutes',
    collapsed: true,
    presets: [
      { start: 'now-15m', end: 'now', label: 'Last 15 minutes' },
      { start: 'now-30m', end: 'now', label: 'Last 30 minutes' },
      { start: 'now-1h', end: 'now', label: 'Last 1 hour' },
      { start: 'now/d', end: 'now/d', label: 'Today' },
      { start: 'now-1d/d', end: 'now-1d/d', label: 'Yesterday' },
      { start: 'now-24h', end: 'now', label: 'Last 24 hours' },
      { start: 'now-30d', end: 'now', label: 'Last 30 days' },
    ],
  },
  render: (args) => <StatefulDateRangePicker {...args} />,
};

const timeRangeKey = (o: Pick<TimeRangeBoundsOption, 'start' | 'end'>) => `${o.start}|${o.end}`;

function StatefulDateRangePicker(props: DateRangePickerProps) {
  const [invalid, setInvalid] = useState<boolean>(false);
  const [recents, setRecents] = useState<TimeRangeBoundsOption[]>([]);
  const [presets, setPresets] = useState<TimeRangeBoundsOption[]>(props.presets ?? []);
  const [settings, setSettings] = useState<DateRangePickerSettings>(props.settings);
  const { onChange, onPresetSave, onPresetDelete, onInputChange, ...rest } = props;

  const handleOnChange = (args: DateRangePickerOnChangeProps) => {
    setInvalid(args.isInvalid);

    if (!args.isInvalid) {
      setRecents((prev) => {
        const deduped = prev.filter((r) => timeRangeKey(r) !== timeRangeKey(args));
        return [{ start: args.start, end: args.end }, ...deduped].slice(0, 10);
      });
    }

    onChange?.(args);
  };

  const handlePresetSave = useCallback(
    (option: TimeRangeBoundsOption) => {
      onPresetSave?.(option);
      setPresets((prev) => {
        const deduped = prev.filter((p) => timeRangeKey(p) !== timeRangeKey(option));
        return [...deduped, option];
      });
    },
    [onPresetSave]
  );

  const handlePresetDelete = useCallback(
    (option: TimeRangeBoundsOption) => {
      onPresetDelete?.(option);
      setPresets((prev) => {
        return prev.filter((p) => timeRangeKey(p) !== timeRangeKey(option));
      });
    },
    [onPresetDelete]
  );

  const handleInputChange = useCallback(
    (value: string) => {
      setInvalid(false);
      onInputChange?.(value);
    },
    [onInputChange]
  );

  return (
    <DateRangePicker
      isInvalid={invalid}
      recent={recents}
      {...rest}
      presets={presets}
      onChange={handleOnChange}
      onInputChange={handleInputChange}
      onPresetSave={onPresetSave ? handlePresetSave : undefined}
      onPresetDelete={onPresetDelete ? handlePresetDelete : undefined}
      settings={settings}
      onSettingsChange={setSettings}
    />
  );
}
