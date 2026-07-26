/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { setUnifiedDocViewerServices } from '@kbn/unified-doc-viewer-plugin/public/plugin';
import { mockUnifiedDocViewerServices } from '@kbn/unified-doc-viewer-plugin/public/__mocks__';
import { DocViewsRegistry, type DocViewerApi } from '@kbn/unified-doc-viewer';
import { ContextApp, type ContextAppProps } from './context_app';
import { createDiscoverServicesMock } from '../../__mocks__/services';
import { DiscoverTestProvider } from '../../__mocks__/test_provider';
import { LoadingStatus } from './services/context_query_state';
import { useContextAppFetch } from './hooks/use_context_app_fetch';
import { useContextAppState } from './hooks/use_context_app_state';
import type { AppState, GetStateReturn, GlobalState } from './services/context_state';
import { createStateContainer } from '@kbn/kibana-utils-plugin/public';
import { buildDataTableRecord } from '@kbn/discover-utils';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';

jest.mock('./hooks/use_context_app_fetch');
jest.mock('./hooks/use_context_app_state');

const services = createDiscoverServicesMock();
const mockUseContextAppFetch = jest.mocked(useContextAppFetch);
const mockUseContextAppState = jest.mocked(useContextAppState);

const appState: AppState = {
  columns: ['message'],
  filters: [],
  grid: {},
  predecessorCount: 5,
  sort: [['@timestamp', 'desc']],
  successorCount: 5,
};

const globalState: GlobalState = {
  filters: [],
};

const stateContainer: GetStateReturn = {
  appState: createStateContainer<AppState>(appState),
  globalState: createStateContainer<GlobalState>(globalState),
  flushToUrl: jest.fn(),
  getFilters: jest.fn(() => []),
  setAppState: jest.fn(),
  setFilters: jest.fn(),
  startSync: jest.fn(),
  stopSync: jest.fn(),
};

const anchorRecord = buildDataTableRecord(
  {
    _id: 'anchor-record',
    _index: 'the-index',
    _score: 1,
    _source: { extension: 'jpg', message: 'anchor' },
  },
  dataViewMock
);

const settledVoidResults: [PromiseSettledResult<void>, PromiseSettledResult<void>] = [
  { status: 'fulfilled', value: undefined },
  { status: 'fulfilled', value: undefined },
];

const setDocViewerRegistry = (render: (props: DocViewRenderProps) => React.ReactElement) => {
  const registry = new DocViewsRegistry();

  registry.add({
    id: 'doc_view_table',
    title: 'Table',
    order: 10,
    render,
  });

  setUnifiedDocViewerServices({
    ...mockUnifiedDocViewerServices,
    unifiedDocViewer: { registry },
  });
};

describe('ContextApp test', () => {
  const addFilterMock = jest.fn();
  const setExpandedDocMock = jest.fn();
  const docViewerRef = React.createRef<DocViewerApi>();
  const defaultProps: ContextAppProps = {
    dataView: dataViewMock,
    anchorId: 'mocked_anchor_id',
    addFilter: addFilterMock,
    expandedDoc: undefined,
    initialDocViewerTabId: undefined,
    docViewerRef,
    setExpandedDoc: setExpandedDocMock,
  };

  const renderComponent = () => {
    const StatefulContextApp = () => {
      const [expandedDoc, setExpandedDocState] = React.useState(defaultProps.expandedDoc);
      const [initialDocViewerTabId, setInitialDocViewerTabId] = React.useState(
        defaultProps.initialDocViewerTabId
      );
      const setExpandedDoc: ContextAppProps['setExpandedDoc'] = (doc, options) => {
        setExpandedDocMock(doc, options);
        setExpandedDocState(doc);
        setInitialDocViewerTabId(options?.initialTabId);
      };

      return (
        <ContextApp
          {...defaultProps}
          expandedDoc={expandedDoc}
          initialDocViewerTabId={initialDocViewerTabId}
          setExpandedDoc={setExpandedDoc}
        />
      );
    };

    renderWithKibanaRenderContext(
      <DiscoverTestProvider services={services}>
        <StatefulContextApp />
      </DiscoverTestProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();

    setDocViewerRegistry(() => <div data-test-subj="docViewTableMock" />);

    mockUseContextAppState.mockReturnValue({
      appState,
      globalState,
      stateContainer,
    });

    mockUseContextAppFetch.mockReturnValue({
      fetchedState: {
        anchor: anchorRecord,
        anchorInterceptedWarnings: [],
        anchorStatus: { value: LoadingStatus.LOADED },
        predecessors: [],
        predecessorsInterceptedWarnings: [],
        predecessorsStatus: { value: LoadingStatus.LOADED },
        successors: [],
        successorsInterceptedWarnings: [],
        successorsStatus: { value: LoadingStatus.LOADED },
      },
      fetchAllRows: jest.fn(async () => settledVoidResults),
      fetchContextRows: jest.fn(async () => settledVoidResults),
      fetchSurroundingRows: jest.fn(async () => undefined),
      resetFetchedState: jest.fn(),
    });
  });

  it('renders correctly', async () => {
    renderComponent();

    expect(await screen.findByTestId('discoverDocTable')).toBeVisible();
    expect(screen.getByTestId('discoverContextAppTitle')).toBeVisible();
    expect(screen.getByTestId('contextDocumentSurroundingHeader')).toBeVisible();
    expect(screen.getByTestId('discoverContextAppTitle')).toHaveTextContent(
      'Documents surrounding #mocked_anchor_id'
    );
    expect(screen.getByTestId('contextDocumentSurroundingHeader')).toHaveTextContent(
      'Documents surrounding #mocked_anchor_id'
    );
  });

  it('should call addFilter from the doc viewer', async () => {
    const user = userEvent.setup();

    setDocViewerRegistry(({ filter }) => (
      <button
        data-test-subj="docViewFilterButton"
        onClick={() => void filter?.('extension', 'jpg', '+')}
      >
        Add filter
      </button>
    ));

    renderComponent();

    await user.click(screen.getByTestId('docTableExpandToggleColumn'));

    expect(await screen.findByTestId('docViewerFlyout')).toBeVisible();

    await user.click(await screen.findByTestId('docViewFilterButton'));

    expect(addFilterMock).toHaveBeenCalledTimes(1);
    expect(addFilterMock).toHaveBeenCalledWith('extension', 'jpg', '+');
  });
});
