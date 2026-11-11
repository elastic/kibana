/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { CopiedPanelsWarning } from './copied_panels_warning';

jest.mock('../../services/kibana_services', () => ({ coreServices: {} }));

describe('CopiedPanelsWarning', () => {
  it('lists each skipped panel on its own line when there are three or fewer', () => {
    renderWithI18n(
      <CopiedPanelsWarning skippedPanelNames={['Sankey', 'Notes']} warningCount={0} />
    );

    expect(screen.getByText('These panels can’t be copied:')).toBeInTheDocument();
    expect(screen.getByText('Sankey')).toHaveAttribute('title', 'Sankey');
    expect(screen.getByText('Notes')).toBeInTheDocument();
  });

  it('names three panels and counts the rest when more panels were skipped', () => {
    renderWithI18n(
      <CopiedPanelsWarning
        skippedPanelNames={['Panel A', 'Panel B', 'Panel C', 'Panel D', 'Panel E']}
        warningCount={0}
      />
    );

    expect(screen.getByText('These panels can’t be copied:')).toBeInTheDocument();
    expect(screen.getByText('Panel C')).toBeInTheDocument();
    expect(screen.queryByText('Panel D')).not.toBeInTheDocument();
    expect(screen.getByText('and 2 more panels')).toBeInTheDocument();
  });

  it('summarizes the items removed by the sanitize route', () => {
    renderWithI18n(<CopiedPanelsWarning skippedPanelNames={[]} warningCount={2} />);

    expect(screen.getByText('2 items removed from the panel.')).toBeInTheDocument();
    expect(screen.queryByTestId('dashboardUnsupportedPanelsList')).not.toBeInTheDocument();
  });
});
