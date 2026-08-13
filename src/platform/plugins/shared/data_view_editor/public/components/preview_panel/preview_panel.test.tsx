/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MatchedItem } from '@kbn/data-views-plugin/public';
import type { Props as PreviewPanelProps } from './preview_panel';
import React from 'react';
import userEvent from '@testing-library/user-event';
import { from } from 'rxjs';
import { INDEX_PATTERN_TYPE } from '@kbn/data-views-plugin/public';
import { PreviewPanel } from './preview_panel';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen, within } from '@testing-library/react';

const indices = [
  { name: 'kibana_1', tags: [], item: { name: 'kibana_1' } },
  { name: 'kibana_2', tags: [], item: { name: 'kibana_2' } },
  { name: 'es', tags: [], item: { name: 'es' } },
] satisfies MatchedItem[];

const expectSelectedViewMode = (label: string) => {
  const button = screen.getByText(label).closest('button');

  expect(button).toHaveClass('euiButtonGroupButton-isSelected');
};

describe('DataViewEditor PreviewPanel', () => {
  const commonProps: Omit<PreviewPanelProps, 'matchedIndices$' | 'title'> = {
    allowHidden: false,
    type: INDEX_PATTERN_TYPE.DEFAULT,
  };

  it('should render normally by default', async () => {
    const matchedIndices$: PreviewPanelProps['matchedIndices$'] = from([
      {
        allIndices: indices,
        exactMatchedIndices: [],
        partialMatchedIndices: [],
        visibleIndices: indices,
      },
    ]);

    renderWithI18n(<PreviewPanel {...commonProps} matchedIndices$={matchedIndices$} title="" />);

    expect(await screen.findByTestId('createIndexPatternStep1IndicesList')).toBeVisible();

    expect(screen.getByText('Your index pattern can match 3 sources.')).toBeVisible();
    expect(
      within(screen.getByTestId('createIndexPatternStep1IndicesList')).getByText('kibana_1')
    ).toBeVisible();
    expect(
      within(screen.getByTestId('createIndexPatternStep1IndicesList')).getByText('kibana_2')
    ).toBeVisible();
    expect(
      within(screen.getByTestId('createIndexPatternStep1IndicesList')).getByText('es')
    ).toBeVisible();
    expect(screen.queryByText('Matching sources')).not.toBeInTheDocument();
  });

  it('should render matching indices and can switch to all indices', async () => {
    const user = userEvent.setup();
    const matchedIndices$: PreviewPanelProps['matchedIndices$'] = from([
      {
        allIndices: indices,
        exactMatchedIndices: [indices[0], indices[1]],
        partialMatchedIndices: [],
        visibleIndices: [indices[0], indices[1]],
      },
    ]);

    renderWithI18n(
      <PreviewPanel {...commonProps} matchedIndices$={matchedIndices$} title="kib*" />
    );

    expect(await screen.findByTestId('createIndexPatternStep1IndicesList')).toBeVisible();
    expect(screen.getByText('Your index pattern matches 2 sources.')).toBeVisible();
    expect(screen.getByText('Visible sources')).toBeVisible();
    expect(screen.getByText('Matching sources')).toBeVisible();
    expectSelectedViewMode('Matching sources');
    expect(
      within(screen.getByTestId('createIndexPatternStep1IndicesList')).queryByText('es')
    ).not.toBeInTheDocument();

    await user.click(screen.getByTestId('allIndices'));

    expectSelectedViewMode('All sources');
    expect(
      within(screen.getByTestId('createIndexPatternStep1IndicesList')).getByText('es')
    ).toBeVisible();
  });

  it('should render matching indices with warnings', async () => {
    const matchedIndices$: PreviewPanelProps['matchedIndices$'] = from([
      {
        allIndices: indices,
        exactMatchedIndices: [],
        partialMatchedIndices: [indices[0], indices[1]],
        visibleIndices: [indices[0], indices[1]],
      },
    ]);

    renderWithI18n(
      <PreviewPanel {...commonProps} matchedIndices$={matchedIndices$} title="kib*" />
    );

    expect(await screen.findByTestId('createIndexPatternStep1IndicesList')).toBeVisible();
    expect(
      screen.getByText("Your index pattern doesn't match any data streams, indices, or index", {
        exact: false,
      })
    ).toBeVisible();
    expect(
      within(screen.getByTestId('createIndexPatternStep1IndicesList')).getAllByText('kib')
    ).toHaveLength(2);
    within(screen.getByTestId('createIndexPatternStep1IndicesList'))
      .getAllByText('kib')
      .forEach((highlightedMatch) => {
        expect(highlightedMatch.closest('strong')).toBeVisible();
      });
    expect(screen.getByText('Matching sources')).toBeVisible();
  });

  it('should render all indices tab when ends with a comma and can switch to matching sources', async () => {
    const user = userEvent.setup();
    const matchedIndices$: PreviewPanelProps['matchedIndices$'] = from([
      {
        allIndices: indices,
        exactMatchedIndices: [indices[0]],
        partialMatchedIndices: [],
        visibleIndices: [indices[0]],
      },
    ]);

    renderWithI18n(
      <PreviewPanel {...commonProps} matchedIndices$={matchedIndices$} title="kibana_1," />
    );

    expect(await screen.findByTestId('createIndexPatternStep1IndicesList')).toBeVisible();
    expect(screen.getByText('kibana_1').closest('strong')).toBeVisible();
    expect(screen.getByText('All sources')).toBeVisible();
    expectSelectedViewMode('All sources');

    await user.click(screen.getByTestId('onlyMatchingIndices'));

    expectSelectedViewMode('Matching sources');
    expect(
      within(screen.getByTestId('createIndexPatternStep1IndicesList')).queryByText('es')
    ).not.toBeInTheDocument();
  });
});
