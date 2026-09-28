/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import type { Template } from '@kbn/workflows-library';
import { RecommendedTemplateCard } from './recommended_template_card';

jest.mock('@kbn/connector-specs/icons', () => ({
  ConnectorIconsMap: new Map(),
}));
jest.mock('../../context/workflows_ui_services');

const HASH = `sha256:${'a'.repeat(64)}`;

const template: Template = {
  slug: 'alert-triage',
  version: '1.0.0',
  availability: '>=9.5.0',
  name: 'Alert triage',
  description: 'Enrich alerts and notify your team',
  categories: ['enrichment'],
  solutions: ['security'],
  definitionUrl: 'templates/alert-triage/1.0.0.yaml',
  contentHash: HASH,
  stepTypes: ['elasticsearch.search', 'slack.postMessage'],
  triggerTypes: ['alert'],
};

describe('RecommendedTemplateCard', () => {
  it('renders name, description, and reason from metadata', () => {
    render(
      <RecommendedTemplateCard
        template={template}
        reason={{
          signal: 'solution',
          label: 'Popular in Security',
          tooltip: 'Based on your current solution — Security',
        }}
        onSelect={jest.fn()}
      />
    );

    expect(screen.getByText('Alert triage')).toBeInTheDocument();
    expect(screen.getByText('Enrich alerts and notify your team')).toBeInTheDocument();
    expect(screen.getByTestId('recommendedTemplateCard-alert-triage-reason')).toHaveTextContent(
      'Popular in Security'
    );
  });

  it('calls onSelect when clicked', () => {
    const onSelect = jest.fn();
    render(
      <RecommendedTemplateCard
        template={template}
        reason={{
          signal: 'popular',
          label: 'Popular starter',
          tooltip: 'A frequently used template from the Template library',
        }}
        onSelect={onSelect}
      />
    );

    fireEvent.click(screen.getByTestId('recommendedTemplateCard-alert-triage'));
    expect(onSelect).toHaveBeenCalledWith(template);
  });

  it('clamps long descriptions', () => {
    render(
      <RecommendedTemplateCard
        template={{
          ...template,
          description:
            'A very long description that should be clamped to two lines so the card grid stays even across recommendations with uneven copy lengths.',
        }}
        reason={{
          signal: 'solution',
          label: 'Popular in Security',
          tooltip: 'Based on your current solution — Security',
        }}
        onSelect={jest.fn()}
      />
    );

    const card = screen.getByTestId('recommendedTemplateCard-alert-triage');
    expect(card).toHaveStyle({ width: '100%', minWidth: '0' });
  });
});
