/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import type { RouteComponentProps } from 'react-router-dom';
import { of } from 'rxjs';
import type { TemplateBody } from '@kbn/workflows-library';
import { LibraryTemplateDetailPage } from './template_detail_page';
import { createStartServicesMock, type StartServicesMock } from '../../mocks';
import { getTestProvider } from '../../shared/mocks/test_providers';

const mockSetWorkflowsBreadcrumbs = jest.fn();
let mockOnLoaded: ((template: TemplateBody) => void) | undefined;
let mockShowGraphPreview: boolean | undefined;
const mockUseTemplate = jest.fn();

jest.mock('@kbn/workflows-ui', () => ({
  ...jest.requireActual('@kbn/workflows-ui'),
  useTemplate: (slug: string | undefined) => mockUseTemplate(slug),
  TemplateDetail: ({
    slug,
    onLoaded,
    showGraphPreview,
  }: {
    slug: string;
    onLoaded: (template: TemplateBody) => void;
    showGraphPreview: boolean;
  }) => {
    mockOnLoaded = onLoaded;
    mockShowGraphPreview = showGraphPreview;
    return <div data-test-subj="mockTemplateDetail">{slug}</div>;
  },
}));

jest.mock('./template_not_found_page', () => ({
  TemplateNotFoundPage: ({ onBackToLibrary }: { onBackToLibrary: () => void }) => (
    <div data-test-subj="workflowLibraryTemplateNotFoundPage">
      <button
        type="button"
        data-test-subj="workflowLibraryTemplateNotFoundBackButton"
        onClick={onBackToLibrary}
      />
    </div>
  ),
}));

jest.mock('../../hooks/use_workflow_breadcrumbs/use_workflow_breadcrumbs', () => ({
  useSetWorkflowsBreadcrumbs: () => mockSetWorkflowsBreadcrumbs,
}));

function buildEnabledServices(): StartServicesMock {
  const services = createStartServicesMock();
  services.settings.globalClient.get.mockReturnValue(true);
  services.settings.globalClient.get$.mockReturnValue(of(true));
  services.application.getUrlForApp.mockReturnValue('/app/workflows/library');
  return services;
}

const createHttpFetchError = (status: number): Error =>
  Object.assign(new Error(`Request failed with status ${status}`), {
    name: 'HttpFetchError',
    request: {},
    response: { status },
  });

const routeProps = (slug: string) =>
  ({
    match: { params: { slug } },
  } as RouteComponentProps<{ slug: string }>);

describe('LibraryTemplateDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnLoaded = undefined;
    mockShowGraphPreview = undefined;
    mockUseTemplate.mockReturnValue({ error: null });
  });

  it('resets breadcrumbs to Library when the route slug changes', () => {
    const services = buildEnabledServices();
    const { rerender } = render(<LibraryTemplateDetailPage {...routeProps('first-template')} />, {
      wrapper: getTestProvider({ services }),
    });

    act(() => {
      mockOnLoaded?.({
        metadata: { slug: 'first-template', name: 'First template' },
      } as TemplateBody);
    });

    expect(mockSetWorkflowsBreadcrumbs).toHaveBeenLastCalledWith(
      expect.arrayContaining([expect.objectContaining({ text: 'First template' })])
    );

    rerender(<LibraryTemplateDetailPage {...routeProps('second-template')} />);

    expect(mockSetWorkflowsBreadcrumbs).toHaveBeenLastCalledWith([
      { text: 'Template library', href: '/app/workflows/library' },
    ]);
  });

  it('always enables the graph preview in the template detail', () => {
    const services = buildEnabledServices();

    render(<LibraryTemplateDetailPage {...routeProps('first-template')} />, {
      wrapper: getTestProvider({ services }),
    });

    expect(mockShowGraphPreview).toBe(true);
  });

  it('renders the not-found page when the template does not exist', () => {
    const services = buildEnabledServices();
    mockUseTemplate.mockReturnValue({ error: createHttpFetchError(404) });

    render(<LibraryTemplateDetailPage {...routeProps('no-such-template')} />, {
      wrapper: getTestProvider({ services }),
    });

    expect(screen.getByTestId('workflowLibraryTemplateNotFoundPage')).toBeInTheDocument();
    expect(screen.queryByTestId('mockTemplateDetail')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('workflowLibraryTemplateNotFoundBackButton'));
    expect(services.application.navigateToUrl).toHaveBeenCalledWith('/app/workflows/library');
  });

  it('keeps the template detail for errors other than not found', () => {
    const services = buildEnabledServices();
    mockUseTemplate.mockReturnValue({ error: createHttpFetchError(500) });

    render(<LibraryTemplateDetailPage {...routeProps('first-template')} />, {
      wrapper: getTestProvider({ services }),
    });

    expect(screen.queryByTestId('workflowLibraryTemplateNotFoundPage')).not.toBeInTheDocument();
    expect(screen.getByTestId('mockTemplateDetail')).toBeInTheDocument();
  });
});
