/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import type { BehaviorSubject } from 'rxjs';
import type { ProjectRouting } from '@kbn/es-query';
import { SavedSearchComponent } from './saved_search';
import type { SavedSearchComponentProps } from '../types';

interface CapturedParentApi {
  projectRouting$?: BehaviorSubject<ProjectRouting | undefined>;
}

const mockCapturedParentApis: CapturedParentApi[] = [];

jest.mock('@kbn/embeddable-plugin/public', () => ({
  EmbeddableRenderer: ({ getParentApi }: { getParentApi: () => CapturedParentApi }) => {
    // mirrors the real renderer, which resolves the parent API once per embeddable
    if (mockCapturedParentApis.length === 0) {
      mockCapturedParentApis.push(getParentApi());
    }
    return null;
  },
}));

const createDependencies = () =>
  ({
    embeddable: {},
    dataViews: { create: jest.fn().mockResolvedValue({ id: 'data-view-id' }) },
    searchSource: {
      createEmpty: () => ({
        setField: jest.fn(),
        serialize: () => ({ searchSourceJSON: '{}', references: [] }),
      }),
    },
  } as unknown as SavedSearchComponentProps['dependencies']);

const renderSavedSearchComponent = (projectRouting?: ProjectRouting) =>
  render(
    <SavedSearchComponent
      dependencies={createDependencies()}
      index="logs-*"
      projectRouting={projectRouting}
    />
  );

describe('SavedSearchComponent project routing', () => {
  beforeEach(() => {
    mockCapturedParentApis.length = 0;
  });

  it('publishes the project routing to the embeddable parent api', async () => {
    renderSavedSearchComponent('_alias:*');

    await waitFor(() => expect(mockCapturedParentApis).toHaveLength(1));
    expect(mockCapturedParentApis[0].projectRouting$?.getValue()).toBe('_alias:*');
  });

  it('publishes updates through the same subject without recreating the embeddable', async () => {
    const { rerender } = renderSavedSearchComponent('_alias:*');

    await waitFor(() => expect(mockCapturedParentApis).toHaveLength(1));
    const [{ projectRouting$ }] = mockCapturedParentApis;

    rerender(
      <SavedSearchComponent
        dependencies={createDependencies()}
        index="logs-*"
        projectRouting="_alias:_origin"
      />
    );

    await waitFor(() => expect(projectRouting$?.getValue()).toBe('_alias:_origin'));
    expect(mockCapturedParentApis).toHaveLength(1);
  });

  it('publishes undefined when no project routing is provided', async () => {
    renderSavedSearchComponent();

    await waitFor(() => expect(mockCapturedParentApis).toHaveLength(1));
    expect(mockCapturedParentApis[0].projectRouting$).toBeDefined();
    expect(mockCapturedParentApis[0].projectRouting$?.getValue()).toBeUndefined();
  });
});
