/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useState } from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { EuiPanel } from '@elastic/eui';
import {
  NotificationTypeFilter,
  type NotificationTypeFilterProps,
} from './notification_type_filter';
import {
  NotificationStateFilter,
  type NotificationStateFilterProps,
  type NotificationStateFilterValue,
} from './notification_state_filter';
import {
  NotificationSpacesFilter,
  type NotificationSpacesFilterProps,
} from './notification_spaces_filter';

const meta: Meta = {
  title: 'Notifications/Filters',
};

export default meta;

const StoryFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EuiPanel paddingSize="m" hasShadow style={{ maxWidth: 540 }}>
    {children}
  </EuiPanel>
);

// ──────────────────────────────────────────────────────────────────────────────
// Type filter
// ──────────────────────────────────────────────────────────────────────────────

const TYPE_PRESETS = {
  demo: {
    typeIds: ['notificationExampleReport', 'notificationExampleAlert', 'notificationExampleCloud'],
    labels: {
      notificationExampleReport: 'Report',
      notificationExampleAlert: 'Alert',
      notificationExampleCloud: 'Cloud',
    },
  },
  unknown: {
    typeIds: ['unknownPlugin1', 'unknownPlugin2', 'unknownPlugin3'],
    labels: undefined,
  },
  long: {
    typeIds: [
      'notificationExampleAlerts',
      'notificationExampleCases',
      'notificationExampleReports',
      'notificationExampleNews',
      'notificationExampleCloud',
      'notificationExampleBackgroundSearch',
      'notificationExampleElastic',
    ],
    labels: {
      notificationExampleAlerts: 'Alerts',
      notificationExampleCases: 'Cases',
      notificationExampleReports: 'Reports',
      notificationExampleNews: 'News',
      notificationExampleCloud: 'Cloud',
      notificationExampleBackgroundSearch: 'Background Search',
      notificationExampleElastic: 'Elastic',
    },
  },
} as const;

type TypePresetId = keyof typeof TYPE_PRESETS;

type TypeStoryArgs = Pick<NotificationTypeFilterProps, never> & {
  preset: TypePresetId;
  /** Comma-separated list of typeIds to start as selected. */
  initiallySelected: string;
};

const TypeFilterTemplate: StoryFn<TypeStoryArgs> = ({ preset, initiallySelected }) => {
  const config = TYPE_PRESETS[preset];
  const typeIds = config.typeIds as readonly string[];
  const initial = useMemo(
    () =>
      new Set(
        initiallySelected
          .split(',')
          .map((s) => s.trim())
          .filter((s) => typeIds.includes(s))
      ),
    [initiallySelected, typeIds]
  );
  const [selected, setSelected] = useState<ReadonlySet<string>>(initial);

  // Reset selection when the preset changes so chips don't reference stale ids.
  useEffect(() => {
    setSelected(initial);
  }, [initial]);

  const onChangeAction = action('onChange');
  return (
    <StoryFrame>
      <NotificationTypeFilter
        typeIds={config.typeIds}
        selectedTypeIds={selected}
        labels={config.labels}
        onChange={(next) => {
          onChangeAction(Array.from(next));
          setSelected(next);
        }}
      />
    </StoryFrame>
  );
};

export const TypeFilter = TypeFilterTemplate.bind({});
TypeFilter.storyName = 'NotificationTypeFilter';
TypeFilter.args = {
  preset: 'demo',
  initiallySelected: '',
};
TypeFilter.argTypes = {
  preset: {
    options: Object.keys(TYPE_PRESETS) as TypePresetId[],
    control: { type: 'select' },
    description:
      'Which typeId set the chip row renders. "demo" matches the example plugin; "unknown" omits labels so typeIds render verbatim; "long" exercises wrapping with seven labeled types.',
  },
  initiallySelected: {
    control: { type: 'text' },
    description: 'Comma-separated typeIds to start as selected. Ignored after the preset changes.',
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// State filter
// ──────────────────────────────────────────────────────────────────────────────

type StateStoryArgs = Pick<NotificationStateFilterProps, never> & {
  initial: NotificationStateFilterValue;
};

const StateFilterTemplate: StoryFn<StateStoryArgs> = ({ initial }) => {
  const [value, setValue] = useState<NotificationStateFilterValue>(initial);
  useEffect(() => setValue(initial), [initial]);
  const onChangeAction = action('onChange');
  return (
    <StoryFrame>
      <NotificationStateFilter
        value={value}
        onChange={(next) => {
          onChangeAction(next);
          setValue(next);
        }}
      />
    </StoryFrame>
  );
};

export const StateFilter = StateFilterTemplate.bind({});
StateFilter.storyName = 'NotificationStateFilter';
StateFilter.args = {
  initial: 'all',
};
StateFilter.argTypes = {
  initial: {
    options: ['all', 'unread', 'pinned'] as NotificationStateFilterValue[],
    control: { type: 'inline-radio' },
    description: 'Which option to render as initially selected.',
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// Spaces filter
// ──────────────────────────────────────────────────────────────────────────────

type SpacesStoryArgs = Pick<NotificationSpacesFilterProps, never> & {
  initialCurrentOnly: boolean;
};

const SpacesFilterTemplate: StoryFn<SpacesStoryArgs> = ({ initialCurrentOnly }) => {
  const [currentOnly, setCurrentOnly] = useState(initialCurrentOnly);
  useEffect(() => setCurrentOnly(initialCurrentOnly), [initialCurrentOnly]);
  const onChangeAction = action('onChange');
  return (
    <StoryFrame>
      <NotificationSpacesFilter
        currentOnly={currentOnly}
        onChange={(next) => {
          onChangeAction(next);
          setCurrentOnly(next);
        }}
      />
    </StoryFrame>
  );
};

export const SpacesFilter = SpacesFilterTemplate.bind({});
SpacesFilter.storyName = 'NotificationSpacesFilter';
SpacesFilter.args = {
  initialCurrentOnly: false,
};
SpacesFilter.argTypes = {
  initialCurrentOnly: {
    control: { type: 'boolean' },
    description: 'Initial state of the "Current only" toggle.',
  },
};
