/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v 3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { StoryObj } from '@storybook/react';
import type { InferenceConnector } from '@kbn/inference-common';

import {
  CaseSummary as Component,
  type CaseSummaryProps as ComponentProps,
} from '../summary/case_summary';

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

const meta = {
  title: 'Case Summary',
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
      control: 'select',
      options: ['sample', 'markdown', 'long'],
      description: 'The case to load and display.',
    },
    loadTime: {
      control: 'number',
      description: 'The time to wait before returning the response.',
      defaultValue: 3000,
    },
  },
  args: {
    caseId: 'sample',
    loadTime: 3,
  },
};

export default meta;

type Story = StoryObj<ComponentProps & { loadTime: number }>;

const getHttp = (caseId: string, loadTime: number) => {
  function get(path: string): Promise<{ connectors: Pick<InferenceConnector, 'connectorId'>[] }>;
  function get(path: string, options: { query: { connectorId?: string } }): Promise<string>;
  async function get(
    _path: string,
    options?: { query: { connectorId?: string } }
  ): Promise<string | { connectors: Pick<InferenceConnector, 'connectorId'>[] }> {
    await new Promise((resolve) => setTimeout(resolve, loadTime * 1000));

    if (options) {
      switch (caseId) {
        case 'markdown':
          return markdownSummary;
        case 'long':
          return longSummary;
        case 'sample':
        default:
          return sampleSummary;
      }
    }

    return {
      connectors: [
        {
          connectorId: 'connector-1',
        },
        {
          connectorId: 'connector-2',
        },
      ],
    };
  }

  const http: ComponentProps['http'] = {
    get,
  };

  return http;
};

export const CaseSummary: Story = {
  render: (args) => (
    <Component
      {...args}
      key={`${args.caseId}-${args.loadTime}`}
      http={getHttp(args.caseId, args.loadTime)}
    />
  ),
};
