/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';

import { CaseSummaryComponent as Component } from '../summary/case_summary.component';

const sampleSummary = `This case involves multiple security alerts related to suspicious network activity.
The investigation revealed several indicators of compromise including:
- Unusual outbound connections to known malicious IP addresses
- Suspicious file downloads from external sources
- Multiple failed authentication attempts

**Recommendations:**
1. Isolate affected systems immediately
2. Review network logs for additional indicators
3. Update security controls and monitoring rules
4. Conduct thorough incident response procedures`;

const markdownSummary = `# Security Alert Summary

## Overview
This case involves **multiple security alerts** related to suspicious network activity.

### Key Findings
- Unusual outbound connections to known malicious IP addresses
- Suspicious file downloads from external sources
- Multiple failed authentication attempts

### Recommendations
1. Isolate affected systems immediately
2. Review network logs for additional indicators
3. Update security controls and monitoring rules
4. Conduct thorough incident response procedures

> **Note**: This is a high-priority case requiring immediate attention.`;

const longSummary = `${sampleSummary}\n\n${sampleSummary}\n\n${sampleSummary}`;

const sampleError = new Error('Failed to generate summary');

const meta = {
  title: 'Case Summary/Case Summary Component',
  component: Component,
  parameters: {
    docs: {
      description: {
        component:
          'A component that displays case summaries with AI-generated content and connector integration.',
      },
    },
  },
  argTypes: {
    caseId: {
      control: 'text',
      description: 'The ID of the case',
    },
    summary: {
      control: 'select',
      options: ['sample', 'markdown', 'long'],
      mapping: {
        sample: sampleSummary,
        markdown: markdownSummary,
        long: longSummary,
      },
      description: 'The summary content to display',
      table: {
        type: {
          summary: 'string',
        },
        defaultValue: {
          summary: 'sample',
        },
      },
    },
    isLoading: {
      control: 'boolean',
      description: 'Whether the component is in loading state',
    },
    error: {
      control: 'radio',
      options: ['none', 'error'],
      mapping: {
        none: null,
        error: sampleError,
      },
      description: 'Error state of the component',
    },
    connectors: {
      control: 'radio',
      options: ['none', 'single', 'multiple'],
      mapping: {
        none: [],
        single: [{ connectorId: 'connector-1' }],
        multiple: [
          { connectorId: 'connector-1' },
          { connectorId: 'connector-2' },
          { connectorId: 'connector-3' },
        ],
      },
      description: 'Available connectors for summary generation',
    },
  },
  args: {
    caseId: 'case-123',
    connectors: 'single' as any,
    summary: 'sample',
    error: 'none' as any,
    isLoading: false,
  },
} as Meta<typeof Component>;

export default meta;

type Story = StoryObj<typeof meta>;

export const CaseSummaryComponent: Story = {
  render: (args) => <Component {...args} onSummaryClick={action('summary-clicked')} />,
};
