/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useCallback, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { EuiFlyoutProps } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiPortal,
  EuiPagination,
  EuiHorizontalRule,
  keys,
  useEuiTheme,
  useIsWithinMinBreakpoint,
  isDOMNode,
  EuiSpacer,
} from '@elastic/eui';
import type { DataTableRecord, DataTableColumnsMeta } from '@kbn/discover-utils/types';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import type { ToastsStart } from '@kbn/core-notifications-browser';
import useObservable from 'react-use/lib/useObservable';
import type { ChromeStart } from '@kbn/core/public';
import type { DocViewFilterFn, DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import type { DocViewerProps } from '@kbn/unified-doc-viewer';
import { UnifiedDocViewer } from '../lazy_doc_viewer';
import { useFlyoutA11y } from './use_flyout_a11y';

export interface UnifiedDocViewerFlyoutProps
  extends Pick<
    DocViewerProps,
    | 'initialTabId'
    | 'initialDocViewerState'
    | 'onInitialDocViewerStateChange'
    | 'onUpdateSelectedTabId'
  > {
  docViewerRef?: DocViewerProps['ref'];
  'data-test-subj'?: string;
  flyoutTitle?: string;
  flyoutDefaultWidth?: EuiFlyoutProps['size'];
  flyoutActions?: React.ReactNode;
  flyoutType?: 'push' | 'overlay';
  flyoutWidthLocalStorageKey?: string;
  services: {
    toastNotifications?: ToastsStart;
    chrome: ChromeStart;
  };
  docViewsRegistry?: DocViewRenderProps['docViewsRegistry'];
  isEsqlQuery: boolean;
  columns: string[];
  columnsMeta?: DataTableColumnsMeta;
  hit: DataTableRecord;
  hits?: DataTableRecord[];
  dataView: DataView;
  hideFilteringOnComputedColumns?: boolean;
  renderCustomHeader?: (props: DocViewRenderProps) => React.ReactElement;
  setExpandedDoc: (doc?: DataTableRecord) => void;
  onClose: () => void;
  onAddColumn: (column: string) => void;
  onRemoveColumn: (column: string) => void;
  onFilter?: DocViewFilterFn;
}

function getIndexByDocId(hits: DataTableRecord[], id: string) {
  return hits.findIndex((h) => {
    return h.id === id;
  });
}

export const FLYOUT_WIDTH_KEY = 'unifiedDocViewer:flyoutWidth';

// matches project layout, but it's a private value, TODO refactor within https://github.com/elastic/kibana/issues/250359
const PROJECT_VIEW_MARGIN_BOTTOM = 8;

/**
 * Flyout displaying an expanded row details
 */
export function UnifiedDocViewerFlyout({
  docViewerRef,
  'data-test-subj': dataTestSubj,
  flyoutTitle,
  flyoutDefaultWidth,
  flyoutActions,
  flyoutType,
  flyoutWidthLocalStorageKey,
  services,
  docViewsRegistry,
  isEsqlQuery,
  columns,
  columnsMeta,
  hit,
  hits,
  dataView,
  hideFilteringOnComputedColumns,
  initialTabId,
  initialDocViewerState,
  renderCustomHeader,
  setExpandedDoc,
  onClose,
  onAddColumn,
  onRemoveColumn,
  onFilter,
  onInitialDocViewerStateChange,
  onUpdateSelectedTabId,
}: UnifiedDocViewerFlyoutProps) {
  const { euiTheme } = useEuiTheme();
  const isXlScreen = useIsWithinMinBreakpoint('xl');
  const chromeStyle = useObservable(services.chrome.getChromeStyle$(), 'classic');
  const isProjectStyle = chromeStyle === 'project';
  const DEFAULT_WIDTH = euiTheme.base * 34;
  const defaultWidth = flyoutDefaultWidth ?? DEFAULT_WIDTH; // Give enough room to search bar to not wrap
  const [flyoutWidth, setFlyoutWidth] = useLocalStorage(
    flyoutWidthLocalStorageKey ?? FLYOUT_WIDTH_KEY,
    defaultWidth
  );
  const flyoutWidthRef = useRef(flyoutWidth ?? defaultWidth);
  const minWidth = euiTheme.base * 24;
  const maxWidth = euiTheme.breakpoint.xl;
  // Get actual hit with updated highlighted searches
  const actualHit = useMemo(() => hits?.find(({ id }) => id === hit?.id) || hit, [hit, hits]);
  const pageCount = useMemo<number>(() => (hits ? hits.length : 0), [hits]);
  const activePage = useMemo<number>(() => {
    const id = hit.id;
    if (!hits || pageCount <= 1) {
      return -1;
    }

    return getIndexByDocId(hits, id);
  }, [hits, hit, pageCount]);

  const renderSubheader = pageCount > 1 || flyoutActions;

  const setPage = useCallback(
    (index: number) => {
      if (hits && hits[index]) {
        setExpandedDoc(hits[index]);
      }
    },
    [hits, setExpandedDoc]
  );

  const onKeyDown = useCallback(
    (ev: React.KeyboardEvent) => {
      if (ev.target instanceof HTMLElement && ev.target.closest('.euiDataGrid__content')) {
        // ignore events triggered from the data grid
        return;
      }

      if (isDOMNode(ev.target) && ev.currentTarget.contains(ev.target) && ev.key === keys.ESCAPE) {
        ev.preventDefault();
        ev.stopPropagation();
        onClose();
      }

      if (ev.target instanceof HTMLInputElement) {
        // ignore events triggered from the search input
        return;
      }

      const isTabButton = (ev.target as HTMLElement).getAttribute('role') === 'tab';
      if (isTabButton) {
        // ignore events triggered when the tab buttons are focused
        return;
      }

      const isResizableButton =
        (ev.target as HTMLElement).getAttribute('data-test-subj') === 'euiResizableButton';
      if (isResizableButton) {
        // ignore events triggered when the resizable button is focused
        return;
      }

      if (ev.key === keys.ARROW_LEFT || ev.key === keys.ARROW_RIGHT) {
        ev.preventDefault();
        ev.stopPropagation();
        setPage(activePage + (ev.key === keys.ARROW_RIGHT ? 1 : -1));
      }
    },
    [activePage, onClose, setPage]
  );

  const addColumn = useCallback(
    (columnName: string) => {
      onAddColumn(columnName);
      services.toastNotifications?.addSuccess(
        i18n.translate('unifiedDocViewer.flyout.toastColumnAdded', {
          defaultMessage: `Column ''{columnName}'' was added`,
          values: { columnName },
        })
      );
    },
    [onAddColumn, services.toastNotifications]
  );

  const removeColumn = useCallback(
    (columnName: string) => {
      onRemoveColumn(columnName);
      services.toastNotifications?.addSuccess(
        i18n.translate('unifiedDocViewer.flyout.toastColumnRemoved', {
          defaultMessage: `Column ''{columnName}'' was removed`,
          values: { columnName },
        })
      );
    },
    [onRemoveColumn, services.toastNotifications]
  );

  const docViewRenderProps = useMemo<DocViewRenderProps>(
    () => ({
      hit: actualHit,
      dataView,
      columns,
      columnsMeta,
      textBasedHits: isEsqlQuery ? hits : undefined,
      filter: onFilter,
      onAddColumn: addColumn,
      onRemoveColumn: removeColumn,
      docViewsRegistry,
      decreaseAvailableHeightBy: isProjectStyle
        ? euiTheme.base + PROJECT_VIEW_MARGIN_BOTTOM
        : euiTheme.base,
      hideFilteringOnComputedColumns,
    }),
    [
      actualHit,
      dataView,
      columns,
      columnsMeta,
      isEsqlQuery,
      hits,
      onFilter,
      addColumn,
      removeColumn,
      docViewsRegistry,
      isProjectStyle,
      euiTheme.base,
      hideFilteringOnComputedColumns,
    ]
  );

  const defaultFlyoutTitle = isEsqlQuery
    ? i18n.translate('unifiedDocViewer.flyout.docViewerEsqlDetailHeading', {
        defaultMessage: 'Result',
      })
    : i18n.translate('unifiedDocViewer.flyout.docViewerDetailHeading', {
        defaultMessage: 'Document',
      });
  const currentFlyoutTitle = flyoutTitle ?? defaultFlyoutTitle;
  const { a11yProps, screenReaderDescription } = useFlyoutA11y({ isXlScreen });

  return (
    <EuiPortal>
      <EuiFlyout
        session="start"
        flyoutMenuProps={{
          title: currentFlyoutTitle,
          'data-test-subj': 'docViewerRowDetailsTitle',
          hideTitle: false,
        }}
        className="DiscoverFlyout" // used to override the z-index of the flyout from SecuritySolution
        onClose={onClose}
        type={flyoutType ?? 'push'}
        // workaround for remounting EUI flyout on resize if session prop is set to 'start'
        size={flyoutWidthRef.current}
        pushMinBreakpoint="xl"
        data-test-subj={dataTestSubj ?? 'docViewerFlyout'}
        onKeyDown={onKeyDown}
        ownFocus={true}
        minWidth={minWidth}
        maxWidth={maxWidth}
        resizable={true}
        onResize={setFlyoutWidth}
        css={{
          maxWidth: `${isXlScreen ? `calc(100vw - ${DEFAULT_WIDTH}px)` : '90vw'} !important`,
        }}
        paddingSize="m"
        aria-label={currentFlyoutTitle}
        {...a11yProps}
      >
        {screenReaderDescription}
        {renderSubheader && (
          <>
            <EuiFlexGroup
              direction="row"
              alignItems="center"
              justifyContent="spaceBetween"
              responsive={false}
              wrap={true}
              css={{ paddingBlock: euiTheme.size.s, paddingInline: euiTheme.size.m }}
            >
              {activePage !== -1 && (
                <EuiFlexItem data-test-subj={`docViewerFlyoutNavigationPage-${activePage}`}>
                  <EuiPagination
                    aria-label={i18n.translate('unifiedDocViewer.flyout.documentNavigation', {
                      defaultMessage: 'Document pagination',
                    })}
                    pageCount={pageCount}
                    activePage={activePage}
                    onPageClick={setPage}
                    compressed
                    data-test-subj="docViewerFlyoutNavigation"
                  />
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false} css={{ marginLeft: 'auto' }}>
                {isEsqlQuery || !flyoutActions ? null : <>{flyoutActions}</>}
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiHorizontalRule margin="none" />
          </>
        )}
        <EuiFlyoutBody>
          {renderCustomHeader && (
            <>
              {renderCustomHeader(docViewRenderProps)}
              <EuiSpacer size="m" />
            </>
          )}
          <UnifiedDocViewer
            ref={docViewerRef}
            initialTabId={initialTabId}
            initialDocViewerState={initialDocViewerState}
            onInitialDocViewerStateChange={onInitialDocViewerStateChange}
            onUpdateSelectedTabId={onUpdateSelectedTabId}
            {...docViewRenderProps}
          />
        </EuiFlyoutBody>
      </EuiFlyout>
    </EuiPortal>
  );
}
