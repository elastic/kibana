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
import type { Filter } from '@kbn/es-query';
import { coreMock } from '@kbn/core/public/mocks';
import { FilterItemComponent } from './filter_item';
import type { FilterItemProps } from './filter_item';

const { uiSettings, docLinks } = coreMock.createStart();

jest.mock('@kbn/data-plugin/public', () => ({
  getDisplayValueFromFilter: () => '',
}));

jest.mock('@kbn/css-utils/public/use_memo_css', () => ({
  useMemoCss: () => ({}),
}));

jest.mock('../filter_view', () => ({
  FilterView: ({ onClick }: { onClick: React.MouseEventHandler }) => (
    <button data-test-subj="filter-badge" onClick={onClick} type="button">
      filter
    </button>
  ),
}));

jest.mock('../filter_editor/filter_editor', () => ({
  FilterEditor: () => <div data-test-subj="mock-filter-editor" />,
}));

// Prevent loading the barrel (which pulls in phrases_values_input → withEuiTheme)
jest.mock('../filter_editor', () => ({
  withCloseFilterEditorConfirmModal: (Component: React.ComponentType<any>) => Component,
}));

// Override only the components that need test-harness behaviour; keep the rest from test-env
jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    EuiPopover: ({
      button,
      children,
      closePopover,
      isOpen,
    }: {
      button: React.ReactNode;
      children: React.ReactNode;
      closePopover: () => void;
      isOpen: boolean;
    }) => (
      <>
        {button}
        {isOpen && (
          <>
            {children}
            <button data-test-subj="simulate-click-outside" onClick={closePopover} type="button">
              outside
            </button>
          </>
        )}
      </>
    ),
  };
});

const filter: Filter = {
  meta: {
    index: 'logstash-*',
    type: 'phrase',
    key: 'host',
    params: { query: 'kibana.org' },
    negate: false,
    disabled: false,
    alias: null,
    isMultiIndex: true, // short-circuit getValueLabel to avoid DataView deps
  },
  query: { match_phrase: { host: 'kibana.org' } },
};

const makeProps = (onCloseFilterPopover: jest.Mock): FilterItemProps => ({
  id: '0',
  filter,
  indexPatterns: [],
  onUpdate: jest.fn(),
  onRemove: jest.fn(),
  intl: {
    formatMessage: ({ defaultMessage }: { defaultMessage: string }) => defaultMessage,
  } as any,
  uiSettings,
  docLinks,
  onCloseFilterPopover,
  onLocalFilterCreate: jest.fn(),
  onLocalFilterUpdate: jest.fn(),
});

describe('FilterItemComponent.closePopover', () => {
  it('does NOT call onCloseFilterPopover when closing the menu popover', () => {
    const onCloseFilterPopover = jest.fn();
    render(<FilterItemComponent {...makeProps(onCloseFilterPopover)} />);

    fireEvent.click(screen.getByTestId('filter-badge'));
    fireEvent.click(screen.getByTestId('simulate-click-outside'));

    expect(onCloseFilterPopover).not.toHaveBeenCalled();
    expect(screen.queryByTestId('editFilter')).not.toBeInTheDocument();
  });

  it('calls onCloseFilterPopover when closing the filter editor', () => {
    const onCloseFilterPopover = jest.fn();
    render(<FilterItemComponent {...makeProps(onCloseFilterPopover)} />);

    fireEvent.click(screen.getByTestId('filter-badge'));
    fireEvent.click(screen.getByTestId('editFilter'));
    fireEvent.click(screen.getByTestId('simulate-click-outside'));

    expect(onCloseFilterPopover).toHaveBeenCalledTimes(1);
  });
});
