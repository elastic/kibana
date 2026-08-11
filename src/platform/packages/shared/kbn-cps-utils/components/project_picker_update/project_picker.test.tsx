/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import type { CPSProject } from '../../types';
import { ProjectPicker } from './project_picker';

class MockIntersectionObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
  takeRecords = jest.fn(() => []);
}

const createProject = (id: string, tags: Partial<CPSProject> = {}): CPSProject => ({
  _id: id,
  _alias: id,
  _type: 'security',
  _organisation: 'org',
  ...tags,
});

describe('ProjectPicker', () => {
  beforeEach(() => {
    window.IntersectionObserver =
      MockIntersectionObserver as unknown as typeof IntersectionObserver;
  });

  it('preserves tag-only routing on mount', async () => {
    const onProjectRoutingChange = jest.fn();

    render(
      <ProjectPicker
        availableProjects={[
          createProject('p1', { _type: 'security' }),
          createProject('p2', { _type: 'observability' }),
        ]}
        onProjectRoutingChange={onProjectRoutingChange}
        projectRouting="_type:security"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('projectPickerListItemSwitch-p1')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('projectPickerListItemSwitch-p2')).not.toBeInTheDocument();
    expect(onProjectRoutingChange).not.toHaveBeenCalled();
  });

  it('preserves tag filters and decoded exclusions on mount', async () => {
    const onProjectRoutingChange = jest.fn();

    render(
      <ProjectPicker
        availableProjects={[
          createProject('p1', { _type: 'security' }),
          createProject('p2', { _type: 'security' }),
        ]}
        onProjectRoutingChange={onProjectRoutingChange}
        projectRouting="_type:security AND _id:* AND NOT _id:p2"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('projectPickerListItemSwitch-p1')).toHaveAttribute(
        'aria-checked',
        'true'
      );
    });
    expect(screen.getByTestId('projectPickerListItemSwitch-p2')).toHaveAttribute(
      'aria-checked',
      'false'
    );
    expect(onProjectRoutingChange).not.toHaveBeenCalled();
  });
});
