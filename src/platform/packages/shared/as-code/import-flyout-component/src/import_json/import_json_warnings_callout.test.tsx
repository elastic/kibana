/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';

import { ImportJsonWarningsCallout } from './import_json_warnings_callout';
import type { ImportJsonRelatedItem } from './types';

const renderCallout = (
  props: Partial<React.ComponentProps<typeof ImportJsonWarningsCallout>> & {
    relatedItems: ImportJsonRelatedItem[];
  }
) =>
  render(
    <I18nProvider>
      <ImportJsonWarningsCallout
        dataTestSubjPrefix="test"
        warnings={[]}
        relatedItemsCount={props.relatedItems.length}
        {...props}
      />
    </I18nProvider>
  );

const missingDataView = {
  type: 'index-pattern',
  type_label: 'Data view',
  id: 'missing-data-view',
  isMissing: true,
};
const existingDataView = {
  type: 'index-pattern',
  type_label: 'Data view',
  id: 'existing-data-view',
  isMissing: false,
};
const libraryItem = { type: 'lens', type_label: 'Visualization', id: 'library-item' };

describe('ImportJsonWarningsCallout', () => {
  it('renders nothing when every related item exists and there are no warnings', () => {
    renderCallout({ relatedItems: [existingDataView] });
    expect(screen.queryByTestId('testWarnings')).not.toBeInTheDocument();
  });

  it('lists missing related items separately and hides the ones that exist', async () => {
    const user = userEvent.setup();
    renderCallout({
      relatedItems: [missingDataView, existingDataView, libraryItem],
      getMissingRelatedItemsSummary: (count) => `${count} data view is missing.`,
    });

    expect(screen.getByText('Review import warnings')).toBeInTheDocument();
    expect(screen.getByText('1 data view is missing.')).toBeInTheDocument();
    expect(
      screen.getByText(
        /This import references 1 related item. Make sure that these items exist in this cluster or space/
      )
    ).toBeInTheDocument();

    await user.click(
      within(screen.getByTestId('testMissingRelatedItemsAccordion')).getByRole('button')
    );
    const missingList = screen.getByTestId('testMissingRelatedItemsList');
    expect(within(missingList).getByText('missing-data-view')).toBeInTheDocument();
    expect(within(missingList).queryByText('existing-data-view')).not.toBeInTheDocument();

    await user.click(within(screen.getByTestId('testRelatedItemsAccordion')).getByRole('button'));
    const uncheckedList = screen.getByTestId('testRelatedItemsList');
    expect(within(uncheckedList).getByText('library-item')).toBeInTheDocument();
    expect(within(uncheckedList).queryByText('existing-data-view')).not.toBeInTheDocument();
  });

  it('counts related items left out of a truncated list as unchecked', () => {
    renderCallout({ relatedItems: [existingDataView, libraryItem], relatedItemsCount: 5 });
    expect(
      screen.getByText(
        /This import references 4 related items. Make sure that these items exist in this cluster or space/
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Showing the first 1.')).toBeInTheDocument();
  });
});
