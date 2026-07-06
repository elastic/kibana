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
import type { Template } from '@kbn/workflows-library';
import { TemplateCard } from './template_card';

jest.mock('@kbn/connector-specs/icons', () => ({
  ConnectorIconsMap: new Map(),
}));
jest.mock('../../context/workflows_ui_services');

const template: Template = {
  slug: 'ip-reputation-check',
  version: '1.0.0',
  availability: '>=9.5.0',
  name: 'IP Reputation Check',
  description: 'Assess the reputation of an IP address.',
  categories: ['enrichment', 'threat-intel'],
  definitionUrl: 'templates/ip-reputation-check/1.0.0.yaml',
  contentHash: 'sha256:abc',
  stepTypes: ['abuseipdb.checkIp'],
  triggerTypes: ['manual'],
};

describe('TemplateCard', () => {
  it('renders the template name, description, and category badges', () => {
    render(<TemplateCard template={template} onSelect={jest.fn()} />);

    expect(screen.getByText('IP Reputation Check')).toBeInTheDocument();
    expect(screen.getByText('Assess the reputation of an IP address.')).toBeInTheDocument();
    expect(screen.getByText('enrichment')).toBeInTheDocument();
    expect(screen.getByText('threat-intel')).toBeInTheDocument();
  });

  it('sets the expected data-test-subj', () => {
    render(<TemplateCard template={template} onSelect={jest.fn()} />);

    expect(
      document.querySelector(
        '[data-test-subj="workflow-library-template-card-ip-reputation-check"]'
      )
    ).toBeInTheDocument();
  });

  it('calls onSelect with the template when clicked', () => {
    const onSelect = jest.fn();
    render(<TemplateCard template={template} onSelect={onSelect} />);

    fireEvent.click(screen.getByText('IP Reputation Check'));

    expect(onSelect).toHaveBeenCalledWith(template);
  });
});
