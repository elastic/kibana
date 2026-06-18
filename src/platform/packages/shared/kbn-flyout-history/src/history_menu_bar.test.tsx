/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import {
  FlyoutHistoryContext,
  type FlyoutHistoryContextValue,
  type HistoryItem,
} from './history_context';
import { HistoryMenuBar } from './history_menu_bar';

jest.mock('./hooks', () => ({
  useGoBack: () => jest.fn(),
}));

const renderWithItems = (items: HistoryItem[]) => {
  const key = Symbol('test');
  const value: FlyoutHistoryContextValue = { historyKey: key, historyItems: items };
  return render(
    <IntlProvider locale="en">
      <FlyoutHistoryContext.Provider value={value}>
        <HistoryMenuBar />
      </FlyoutHistoryContext.Provider>
    </IntlProvider>
  );
};

const makeItem = (title: string): HistoryItem => ({ title, onClick: jest.fn() });

describe('HistoryMenuBar', () => {
  it('renders nothing when there are no history items', () => {
    const { container } = renderWithItems([]);
    expect(container).toBeEmptyDOMElement();
  });

  it.each([
    { name: '1 item', items: [makeItem('Item A')], hasHistoryButton: false },
    { name: '2+ items', items: [makeItem('Item A'), makeItem('Item B')], hasHistoryButton: true },
  ])(
    'renders Back button and conditionally history chevron with $name',
    ({ items, hasHistoryButton }) => {
      renderWithItems(items);
      expect(screen.getByTestId('euiFlyoutMenuBackButton')).toBeInTheDocument();
      if (hasHistoryButton) {
        expect(screen.getByTestId('euiFlyoutMenuHistoryButton')).toBeInTheDocument();
      } else {
        expect(screen.queryByTestId('euiFlyoutMenuHistoryButton')).not.toBeInTheDocument();
      }
    }
  );

  it('calls item onClick when a history item is clicked', () => {
    const itemA = makeItem('Item A');
    const itemB = makeItem('Item B');
    renderWithItems([itemA, itemB]);

    fireEvent.click(screen.getByTestId('euiFlyoutMenuHistoryButton'));
    expect(screen.getByTestId('euiFlyoutMenuHistoryItem-0')).toBeInTheDocument();
    expect(screen.getByTestId('euiFlyoutMenuHistoryItem-1')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('euiFlyoutMenuHistoryItem-0'));

    expect(itemA.onClick).toHaveBeenCalledTimes(1);
  });
});
