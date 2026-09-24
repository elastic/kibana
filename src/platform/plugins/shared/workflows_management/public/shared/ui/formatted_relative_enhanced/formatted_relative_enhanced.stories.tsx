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

const Row = ({ value }: { value: Date }) => {
  const days = Math.abs(moment().diff(moment(value), 'days'));
  const label = `${moment(value).format('MMM D')}  (${days}d ago)`;
  return (
    <div style={{ display: 'flex', gap: 24, padding: '4px 0', fontFamily: 'monospace' }}>
      <span style={{ width: 220, color: '#69707d' }}>{label}</span>
      <FormattedRelativeEnhanced value={value} />
    </div>
  );
};

// Dates hand-picked to cross the previous calendar month by different elapsed
// distances — this is where selectUnit's calendar arithmetic mis-picks "month".
// The rows below the divider are regressions kept "unchanged" cases.
export const CalendarBoundaries: Story = {
  render: () => {
    const startOfMonth = moment().startOf('month').hour(12).minute(0).second(0);
    return (
      <div style={{ padding: 16 }}>
        <Row value={startOfMonth.clone().subtract(1, 'day').toDate()} />
        <Row value={startOfMonth.clone().subtract(6, 'days').toDate()} />
        <Row value={startOfMonth.clone().subtract(14, 'days').toDate()} />
        <div style={{ borderTop: '1px dashed #d3dae6', margin: '8px 0' }} />
        <Row value={moment().subtract(45, 'days').toDate()} />
        <Row value={moment().subtract(6, 'months').toDate()} />
        <Row value={moment().subtract(2, 'years').toDate()} />
      </div>
    );
  },
};
