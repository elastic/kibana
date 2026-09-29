/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';
import type { Template } from '@kbn/workflows-library';
import { CatalogBrowser } from './catalog_browser';
import { useActiveSolution } from '../hooks/use_active_solution';
import { useCatalog } from '../hooks/use_catalog';

vi.mock('@kbn/connector-specs/icons', () => {
  const mocked = {
    ConnectorIconsMap: new Map(),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../context/workflows_ui_services');

vi.mock('../hooks/use_catalog', () => {
  const mocked = {
    useCatalog: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../hooks/use_active_solution', () => {
  const mocked = {
    useActiveSolution: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

const renderBrowser = (onSelect = vi.fn()) => render(<CatalogBrowser onSelect={onSelect} />);

const buildTemplate = (overrides: Partial<Template> = {}): Template => ({
  slug: 'ip-reputation-check',
  version: '1.0.0',
  availability: '>=9.5.0',
  name: 'IP Reputation Check',
  description: 'Assess the reputation of an IP address.',
  categories: ['enrichment'],
  definitionUrl: 'templates/ip-reputation-check/1.0.0.yaml',
  contentHash: 'sha256:abc',
  stepTypes: ['abuseipdb.checkIp'],
  triggerTypes: ['manual'],
  ...overrides,
});

const mockUseCatalog = vi.mocked(useCatalog);
const mockUseActiveSolution = vi.mocked(useActiveSolution);

function mockCatalogState(overrides: Partial<ReturnType<typeof useCatalog>>) {
  mockUseCatalog.mockReturnValue({
    templates: [],
    allTemplates: [],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useCatalog>);
}

describe('CatalogBrowser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseActiveSolution.mockReturnValue(undefined);
  });

  it('shows a centered loading spinner while the catalog is fetching', () => {
    mockCatalogState({ isLoading: true });

    renderBrowser();

    expect(document.querySelector('[data-test-subj="workflowLibraryLoading"]')).toBeInTheDocument();
  });

  it('shows an error state with a retry action on API failure', () => {
    const refetch = vi.fn();
    mockCatalogState({ isError: true, refetch });

    renderBrowser();

    const retryButton = screen.getByTestId('workflowLibraryRetryButton');
    fireEvent.click(retryButton);
    expect(refetch).toHaveBeenCalled();
  });

  it('shows an empty-catalog message when there are no templates at all', () => {
    mockCatalogState({ templates: [], allTemplates: [] });

    renderBrowser();

    expect(
      document.querySelector('[data-test-subj="workflowLibraryEmptyCatalog"]')
    ).toBeInTheDocument();
  });

  it('shows a no-matches message when filters exclude every template', () => {
    const template = buildTemplate();
    mockCatalogState({ templates: [], allTemplates: [template] });

    renderBrowser();

    expect(
      document.querySelector('[data-test-subj="workflowLibraryNoMatches"]')
    ).toBeInTheDocument();
  });

  it('renders template cards when templates are available', () => {
    const templates = [buildTemplate({ slug: 'a' }), buildTemplate({ slug: 'b', name: 'Other' })];
    mockCatalogState({ templates, allTemplates: templates });

    renderBrowser();

    expect(
      document.querySelector('[data-test-subj="workflow-library-template-card-a"]')
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-test-subj="workflow-library-template-card-b"]')
    ).toBeInTheDocument();
  });

  it('calls onSelect when a template card is clicked', () => {
    const template = buildTemplate();
    mockCatalogState({ templates: [template], allTemplates: [template] });
    const onSelect = vi.fn();

    renderBrowser(onSelect);
    fireEvent.click(screen.getByText('IP Reputation Check'));

    expect(onSelect).toHaveBeenCalledWith(template);
  });

  it('pre-selects and disables the solution filter when an active solution is detected', () => {
    mockUseActiveSolution.mockReturnValue('security');
    const templates = [buildTemplate({ solutions: ['security'] })];
    mockCatalogState({ templates, allTemplates: templates });

    renderBrowser();

    const solutionSelect = screen.getByTestId('workflowLibrarySolutionFilter') as HTMLSelectElement;
    expect(solutionSelect).toBeDisabled();
    expect(solutionSelect.value).toBe('security');
  });

  it('scopes category facet counts by the active solution, excluding other solutions', () => {
    mockUseActiveSolution.mockReturnValue('security');
    const allTemplates = [
      buildTemplate({ slug: 'a', solutions: ['security'], categories: ['enrichment'] }),
      buildTemplate({ slug: 'b', solutions: ['observability'], categories: ['enrichment'] }),
    ];
    mockCatalogState({ templates: [allTemplates[0]], allTemplates });

    renderBrowser();

    expect(screen.getByTestId('workflowLibraryCategoryFacet-enrichment')).toHaveTextContent('1');
  });
});
