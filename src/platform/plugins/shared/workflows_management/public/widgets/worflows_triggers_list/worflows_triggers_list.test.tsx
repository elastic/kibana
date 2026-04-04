/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { WorkflowsTriggersList } from './worflows_triggers_list';

jest.mock('@kbn/workflows', () => ({
  isTriggerType: jest.fn((type: string) => ['alert', 'manual', 'scheduled'].includes(type)),
}));

jest.mock('../../trigger_schemas', () => ({
  triggerSchemas: {
    getTriggerDefinition: jest.fn(() => undefined),
  },
}));

describe('WorkflowsTriggersList', () => {
  it('renders the empty state when triggers array is empty', () => {
    render(<WorkflowsTriggersList triggers={[]} />);
    expect(screen.getByText('No triggers')).toBeInTheDocument();
  });

  it('renders a single trigger with its label', () => {
    render(<WorkflowsTriggersList triggers={[{ type: 'manual' }]} />);
    expect(screen.getByText('Manual')).toBeInTheDocument();
  });

  it('renders the first trigger and an overflow badge for multiple triggers', () => {
    render(<WorkflowsTriggersList triggers={[{ type: 'alert' }, { type: 'manual' }]} />);
    expect(screen.getByText('Alert')).toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  it('renders the first trigger and overflow badge for three triggers', () => {
    render(
      <WorkflowsTriggersList
        triggers={[{ type: 'alert' }, { type: 'manual' }, { type: 'scheduled' }]}
      />
    );
    expect(screen.getByText('Alert')).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('uses capitalized type as label for unknown trigger types', () => {
    render(<WorkflowsTriggersList triggers={[{ type: 'custom_thing' }]} />);
    expect(screen.getByText('Custom_thing')).toBeInTheDocument();
  });

  describe('responsive structure', () => {
    it('renders trigger icon with title attribute for native tooltip', () => {
      render(<WorkflowsTriggersList triggers={[{ type: 'manual' }]} />);
      const icon = document.querySelector('[title="Manual"]');
      expect(icon).toBeInTheDocument();
    });

    it('renders the trigger label in a text element alongside the icon', () => {
      render(<WorkflowsTriggersList triggers={[{ type: 'alert' }]} />);
      expect(screen.getByText('Alert')).toBeInTheDocument();
    });

    it('renders the "No triggers" text for empty triggers', () => {
      render(<WorkflowsTriggersList triggers={[]} />);
      expect(screen.getByText('No triggers')).toBeInTheDocument();
    });
  });
});
