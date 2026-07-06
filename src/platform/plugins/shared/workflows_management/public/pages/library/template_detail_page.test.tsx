/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, render, waitFor } from '@testing-library/react';
import React from 'react';
import type { RouteComponentProps } from 'react-router-dom';
import { of } from 'rxjs';
import type { TemplateBody } from '@kbn/workflows-library';
import { LibraryTemplateDetailPage } from './template_detail_page';
import { createStartServicesMock, type StartServicesMock } from '../../mocks';
import { getTestProvider } from '../../shared/mocks/test_providers';

const mockSetWorkflowsBreadcrumbs = jest.fn();
let mockOnLoaded: ((template: TemplateBody) => void) | undefined;

jest.mock('@kbn/workflows-ui', () => ({
  ...jest.requireActual('@kbn/workflows-ui'),
  TemplateDetail: ({
    slug,
    onLoaded,
  }: {
    slug: string;
    onLoaded: (template: TemplateBody) => void;
  }) => {
    mockOnLoaded = onLoaded;
    return <div data-test-subj="mockTemplateDetail">{slug}</div>;
  },
}));

jest.mock('../../hooks/use_workflow_breadcrumbs/use_workflow_breadcrumbs', () => ({
  useSetWorkflowsBreadcrumbs: () => mockSetWorkflowsBreadcrumbs,
}));

function buildEnabledServices(): StartServicesMock {
  const services = createStartServicesMock();
  services.settings.globalClient.get.mockReturnValue(true);
  services.settings.globalClient.get$.mockReturnValue(of(true));
  return services;
}

const routeProps = (slug: string) =>
  ({
    match: { params: { slug } },
  } as RouteComponentProps<{ slug: string }>);

describe('LibraryTemplateDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnLoaded = undefined;
  });

  it('resets breadcrumbs to Library when the route slug changes', async () => {
    const services = buildEnabledServices();
    const { rerender } = render(<LibraryTemplateDetailPage {...routeProps('first-template')} />, {
      wrapper: getTestProvider({ services }),
    });

    act(() => {
      mockOnLoaded?.({ metadata: { name: 'First template' } } as TemplateBody);
    });

    await waitFor(() => {
      expect(mockSetWorkflowsBreadcrumbs).toHaveBeenLastCalledWith(
        expect.arrayContaining([expect.objectContaining({ text: 'First template' })])
      );
    });

    rerender(<LibraryTemplateDetailPage {...routeProps('second-template')} />);

    await waitFor(() => {
      expect(mockSetWorkflowsBreadcrumbs).toHaveBeenLastCalledWith([
        expect.objectContaining({ text: 'Library' }),
      ]);
    });
  });
});
