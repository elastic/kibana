/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Meta, StoryObj } from '@storybook/react';
import moment from 'moment';
import React from 'react';
import { FormattedRelativeEnhanced } from './formatted_relative_enhanced';
import { kibanaReactDecorator } from '../../../../.storybook/decorators';

const meta: Meta<typeof FormattedRelativeEnhanced> = {
  title: 'Workflows Management/Shared/FormattedRelativeEnhanced',
  component: FormattedRelativeEnhanced,
  decorators: [kibanaReactDecorator],
};

export default meta;
type Story = StoryObj<typeof FormattedRelativeEnhanced>;

const Row = ({ label, value }: { label: string; value: Date }) => (
  <div style={{ display: 'flex', gap: 16, padding: '4px 0', fontFamily: 'monospace' }}>
    <span style={{ width: 220, color: '#69707d' }}>{label}</span>
    <FormattedRelativeEnhanced value={value} />
  </div>
);

export const CalendarBoundaries: Story = {
  render: () => {
    const now = moment();
    return (
      <div style={{ padding: 16 }}>
        <Row label="30 seconds ago" value={now.clone().subtract(30, 'seconds').toDate()} />
        <Row label="5 minutes ago" value={now.clone().subtract(5, 'minutes').toDate()} />
        <Row label="2 hours ago" value={now.clone().subtract(2, 'hours').toDate()} />
        <Row label="5 days ago" value={now.clone().subtract(5, 'days').toDate()} />
        <Row label="16 days ago" value={now.clone().subtract(16, 'days').toDate()} />
        <Row label="45 days ago" value={now.clone().subtract(45, 'days').toDate()} />
        <Row label="6 months ago" value={now.clone().subtract(6, 'months').toDate()} />
        <Row label="2 years ago" value={now.clone().subtract(2, 'years').toDate()} />
      </div>
    );
  },
};
