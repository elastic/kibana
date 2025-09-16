/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { buildDataTableRecord } from '@kbn/discover-utils';
import type { DocViewerProps } from './doc_viewer';
import { DocViewer, INITIAL_TAB } from './doc_viewer';
import type { DocViewRenderProps } from '../../types';
import { DocViewsRegistry } from '../..';
import { dataViewMock, esHitsMockWithSort } from '@kbn/discover-utils/src/__mocks__';
import { analyticsServiceMock } from '@kbn/core-analytics-browser-mocks';
import { KibanaErrorBoundaryProvider } from '@kbn/shared-ux-error-boundary';
import userEvent from '@testing-library/user-event';

const analytics = analyticsServiceMock.createAnalyticsServiceStart();
const records = esHitsMockWithSort.map((hit) => buildDataTableRecord(hit, dataViewMock));

const mockSetLocalStorage = jest.fn();
const mockLocalStorageKey = INITIAL_TAB;
let mockTestInitialLocalStorageValue: string | undefined;

jest.mock('react-use/lib/useLocalStorage', () => {
  return jest.fn((key: string, initialValue: number) => {
    if (key !== mockLocalStorageKey) {
      throw new Error(`Unexpected key: ${key}`);
    }
    return [mockTestInitialLocalStorageValue ?? initialValue, mockSetLocalStorage];
  });
});

const WrappedDocViewer = (props: DocViewerProps) => (
  <KibanaErrorBoundaryProvider analytics={analytics}>
    <DocViewer {...props} />
  </KibanaErrorBoundaryProvider>
);

describe('<DocViewer />', () => {
  test('Render <DocViewer/> with 3 different tabs', () => {
    const registry = new DocViewsRegistry();
    registry.add({ id: 'function', order: 10, title: 'Render function', component: jest.fn() });
    registry.add({
      id: 'component',
      order: 20,
      title: 'React component',
      component: () => <div>test</div>,
    });
    registry.add({
      id: 'invalid',
      order: 30,
      title: 'Invalid doc view',
      component: () => {
        throw new Error('Invalid');
      },
    });

    const renderProps = { hit: {} } as DocViewRenderProps;

    const { container } = render(
      <WrappedDocViewer docViews={registry.getAll()} {...renderProps} />
    );

    expect(container).toMatchSnapshot();
  });

  test('Render <DocViewer/> with 1 tab displaying error message', async () => {
    const errorMsg = 'Catch me if you can!';
    const registry = new DocViewsRegistry();
    registry.add({
      id: 'component',
      order: 10,
      title: 'React component',
      component: () => {
        throw new Error(errorMsg);
      },
    });
    const renderProps = {
      hit: buildDataTableRecord({ _index: 't', _id: '1' }),
    } as DocViewRenderProps;
    render(<WrappedDocViewer docViews={registry.getAll()} {...renderProps} />);
    expect(screen.getByTestId('sectionErrorBoundaryPromptBody')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Show details'));
    expect(screen.getByText(new RegExp(`${errorMsg}`))).toBeInTheDocument();
  });

  test('should not prevent rendering of other tabs when one tab throws an error', async () => {
    const registry = new DocViewsRegistry();
    registry.add({
      id: 'valid',
      order: 10,
      title: 'Valid doc view',
      component: () => <div>Valid</div>,
    });
    registry.add({
      id: 'error',
      order: 20,
      title: 'Error doc view',
      component: () => {
        throw new Error('Invalid');
      },
    });
    const renderProps = {
      hit: buildDataTableRecord({ _index: 't', _id: '1' }),
    } as DocViewRenderProps;
    render(<WrappedDocViewer docViews={registry.getAll()} {...renderProps} />);
    expect(screen.queryByTestId('sectionErrorBoundaryPromptBody')).not.toBeInTheDocument();
    await userEvent.click(screen.getByText('Error doc view'));
    expect(screen.getByTestId('sectionErrorBoundaryPromptBody')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Valid doc view'));
    expect(screen.queryByTestId('sectionErrorBoundaryPromptBody')).not.toBeInTheDocument();
  });

  test('should save active tab to local storage', () => {
    const registry = new DocViewsRegistry();
    registry.add({ id: 'test1', order: 10, title: 'Render function', component: jest.fn() });
    registry.add({ id: 'test2', order: 20, title: 'Render function', component: jest.fn() });

    render(
      <WrappedDocViewer docViews={registry.getAll()} hit={records[0]} dataView={dataViewMock} />
    );

    expect(screen.getByTestId('docViewerTab-test1').getAttribute('aria-selected')).toBe('true');
    expect(screen.getByTestId('docViewerTab-test2').getAttribute('aria-selected')).toBe('false');

    act(() => {
      screen.getByTestId('docViewerTab-test2').click();
    });

    expect(screen.getByTestId('docViewerTab-test1').getAttribute('aria-selected')).toBe('false');
    expect(screen.getByTestId('docViewerTab-test2').getAttribute('aria-selected')).toBe('true');
    expect(mockSetLocalStorage).toHaveBeenCalledWith('kbn_doc_viewer_tab_test2');

    act(() => {
      screen.getByTestId('docViewerTab-test1').click();
    });

    expect(screen.getByTestId('docViewerTab-test1').getAttribute('aria-selected')).toBe('true');
    expect(screen.getByTestId('docViewerTab-test2').getAttribute('aria-selected')).toBe('false');
    expect(mockSetLocalStorage).toHaveBeenCalledWith('kbn_doc_viewer_tab_test1');
  });

  test('should restore active tab from local storage', () => {
    const registry = new DocViewsRegistry();
    registry.add({ id: 'test1', order: 10, title: 'Render function', component: jest.fn() });
    registry.add({ id: 'test2', order: 20, title: 'Render function', component: jest.fn() });

    mockTestInitialLocalStorageValue = 'kbn_doc_viewer_tab_test2';

    render(
      <WrappedDocViewer docViews={registry.getAll()} hit={records[0]} dataView={dataViewMock} />
    );

    expect(screen.getByTestId('docViewerTab-test1').getAttribute('aria-selected')).toBe('false');
    expect(screen.getByTestId('docViewerTab-test2').getAttribute('aria-selected')).toBe('true');

    mockTestInitialLocalStorageValue = undefined;
  });

  test('should not restore a tab from local storage if unavailable', () => {
    const registry = new DocViewsRegistry();
    registry.add({ id: 'test1', order: 10, title: 'Render function', component: jest.fn() });
    registry.add({ id: 'test2', order: 20, title: 'Render function', component: jest.fn() });

    mockTestInitialLocalStorageValue = 'kbn_doc_viewer_tab_test3';

    render(
      <WrappedDocViewer docViews={registry.getAll()} hit={records[0]} dataView={dataViewMock} />
    );

    expect(screen.getByTestId('docViewerTab-test1').getAttribute('aria-selected')).toBe('true');
    expect(screen.getByTestId('docViewerTab-test2').getAttribute('aria-selected')).toBe('false');

    mockTestInitialLocalStorageValue = undefined;
  });

  test('should render if a specific tab is passed as prop', () => {
    const initialTabId = 'test2';

    const registry = new DocViewsRegistry();
    registry.add({ id: 'test1', order: 10, title: 'Render 1st Tab', component: jest.fn() });
    registry.add({ id: initialTabId, order: 20, title: 'Render 2nd Tab', component: jest.fn() });
    registry.add({ id: 'test3', order: 30, title: 'Render 3rd Tab', component: jest.fn() });

    render(
      <WrappedDocViewer
        docViews={registry.getAll()}
        initialTabId={initialTabId}
        hit={records[0]}
        dataView={dataViewMock}
      />
    );

    expect(screen.getByTestId('docViewerTab-test1').getAttribute('aria-selected')).toBe('false');
    expect(screen.getByTestId('docViewerTab-test2').getAttribute('aria-selected')).toBe('true');
    expect(screen.getByTestId('docViewerTab-test3').getAttribute('aria-selected')).toBe('false');
  });
});
