/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Filter } from '@kbn/es-query';
import { coreMock } from '@kbn/core/public/mocks';
import { FilterItemComponent } from './filter_item';
import type { FilterItemProps } from './filter_item';

const { uiSettings, docLinks } = coreMock.createStart();

vi.mock('@kbn/data-plugin/public', () => {
  const mocked = {
    getDisplayValueFromFilter: () => '',
  };
  return { ...mocked, default: mocked };
});

vi.mock('@kbn/css-utils/public/use_memo_css', () => {
  const mocked = {
    useMemoCss: () => ({}),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../filter_view', () => {
  const mocked = {
    FilterView: ({ onClick }: { onClick: React.MouseEventHandler }) => (
      <button data-test-subj="filter-badge" onClick={onClick} type="button">
        filter
      </button>
    ),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../filter_editor/filter_editor', () => {
  const mocked = {
    FilterEditor: () => <div data-test-subj="mock-filter-editor" />,
  };
  return { ...mocked, default: mocked };
});

// Prevent loading the barrel (which pulls in phrases_values_input → withEuiTheme)
vi.mock('../filter_editor', () => {
  const mocked = {
    withCloseFilterEditorConfirmModal: (Component: React.ComponentType<any>) => Component,
  };
  return { ...mocked, default: mocked };
});

// Override only the components that need test-harness behaviour; keep the rest from test-env
vi.mock('@elastic/eui', async () => {
  const actual = await vi.importActual('@elastic/eui');
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

const makeProps = (onCloseFilterPopover: Mock): FilterItemProps => ({
  id: '0',
  filter,
  indexPatterns: [],
  onUpdate: vi.fn(),
  onRemove: vi.fn(),
  intl: {
    formatMessage: ({ defaultMessage }: { defaultMessage: string }) => defaultMessage,
  } as any,
  uiSettings,
  docLinks,
  onCloseFilterPopover,
  onLocalFilterCreate: vi.fn(),
  onLocalFilterUpdate: vi.fn(),
});

describe('FilterItemComponent.closePopover', () => {
  it('does NOT call onCloseFilterPopover when closing the menu popover', () => {
    const onCloseFilterPopover = vi.fn();
    render(<FilterItemComponent {...makeProps(onCloseFilterPopover)} />);

    fireEvent.click(screen.getByTestId('filter-badge'));
    fireEvent.click(screen.getByTestId('simulate-click-outside'));

    expect(onCloseFilterPopover).not.toHaveBeenCalled();
    expect(screen.queryByTestId('editFilter')).not.toBeInTheDocument();
  });

  it('calls onCloseFilterPopover when closing the filter editor', () => {
    const onCloseFilterPopover = vi.fn();
    render(<FilterItemComponent {...makeProps(onCloseFilterPopover)} />);

    fireEvent.click(screen.getByTestId('filter-badge'));
    fireEvent.click(screen.getByTestId('editFilter'));
    fireEvent.click(screen.getByTestId('simulate-click-outside'));

    expect(onCloseFilterPopover).toHaveBeenCalledTimes(1);
  });
});
