/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import type { UnifiedDocViewerStorybookArgs } from '../../../../.storybook/preview';
import APMSpanFixture from '../../../__fixtures__/span_apm_minimal.json';
import ContentFrameworkSection from '.';
import type { ContentFrameworkSectionProps } from './section';

type Args = UnifiedDocViewerStorybookArgs<ContentFrameworkSectionProps>;
const meta = {
  title: 'Content Framework/Section',
  component: ContentFrameworkSection,
} satisfies Meta<typeof ContentFrameworkSection>;

export default meta;
type Story = StoryObj<Args>;

export const Basic: Story = {
  args: {
    hit: APMSpanFixture,
    id: 'basic',
    title: 'Section Title',
    description: 'This is a description for the section.',
    actions: [
      {
        icon: 'expand',
        onClick: () => alert('First action clicked!'),
        ariaLabel: 'First action ariaLabel',
        dataTestSubj: 'unifiedDocViewerSectionActionButton-expand',
      },
      {
        icon: 'discoverApp',
        onClick: () => alert('Second action clicked!'),
        ariaLabel: 'Second action ariaLabel',
        dataTestSubj: 'unifiedDocViewerSectionActionButton-discoverApp',
      },
      {
        icon: 'fullScreen',
        onClick: () => alert('Third action clicked!'),
        ariaLabel: 'Third action ariaLabel',
        label: 'Third action label',
        dataTestSubj: 'unifiedDocViewerSectionActionButton-fullScreen',
      },
    ],
    children: <div>Additional content goes here.</div>,
  },
};
