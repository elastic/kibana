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
import { CatalogTemplateIcons } from './catalog_template_icons';

jest.mock('@kbn/connector-specs/icons', () => ({
  ConnectorIconsMap: new Map(),
}));
jest.mock('../../context/workflows_ui_services');
jest.mock('../../components/step_icons', () => ({
  getBaseConnectorType: (type: string) => type.split('.')[0] ?? type,
  TypeIcon: ({ type }: { type: string }) => <span data-test-subj={`type-icon-${type}`}>{type}</span>,
}));

describe('CatalogTemplateIcons', () => {
  it('shows a +N badge when icons exceed maxVisible', () => {
    render(
      <CatalogTemplateIcons
        maxVisible={4}
        triggerTypes={['alert', 'scheduled']}
        stepTypes={['slack.postMessage', 'elasticsearch.search', 'http.request', 'case.create']}
      />
    );

    expect(screen.getByTestId('type-icon-alert')).toBeInTheDocument();
    expect(screen.getByTestId('type-icon-scheduled')).toBeInTheDocument();
    expect(screen.getByTestId('type-icon-slack.postMessage')).toBeInTheDocument();
    expect(screen.getByTestId('type-icon-elasticsearch.search')).toBeInTheDocument();
    expect(screen.queryByTestId('type-icon-http.request')).not.toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('does not show overflow when within the cap', () => {
    render(
      <CatalogTemplateIcons
        maxVisible={4}
        triggerTypes={['manual']}
        stepTypes={['slack.postMessage', 'elasticsearch.search']}
      />
    );

    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
  });
});
