/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { type AggregateQuery } from '@kbn/es-query';
import { appendWhereClauseToESQLQuery } from '@kbn/esql-utils';
import {
  EuiBadge,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTextTruncate,
  EuiWrappingPopover,
  copyToClipboard,
} from '@elastic/eui';
import { NumberBadge, type DataCascadeRowProps } from '@kbn/shared-ux-document-data-cascade';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { UnifiedDataTableProps } from '@kbn/unified-data-table';
import { getPatternCellRenderer } from '../../../../../../context_awareness/profile_providers/common/patterns/pattern_cell_renderer';
import { type ESQLStatsQueryMeta } from '../utils';

import type { ESQLDataGroupNode, DataTableRecord } from './types';
import { constructCascadeQuery, type SupportedStatsFunction } from '../utils';
import type { TabStateGlobalState } from '../../../../state_management/redux';
import type { DiscoverAppLocator } from '../../../../../../../common/app_locator';

interface RowContext {
  groupId: string;
  groupValue: string;
}

interface RowClickActionContext {
  editorQuery: AggregateQuery;
  editorQueryMeta: ESQLStatsQueryMeta;
  rowContext: RowContext;
  services: UnifiedDataTableProps['services'];
  closeActionMenu: () => void;
  globalState: TabStateGlobalState;
}

const contextRowActions: Array<
  NonNullable<EuiContextMenuPanelDescriptor['items']>[number] & {
    renderFor?: SupportedStatsFunction;
  }
> = [
  {
    name: i18n.translate('discover.esql_data_cascade.row.action.copy_to_clipboard', {
      defaultMessage: 'Copy to clipboard',
    }),
    icon: 'copy',
    onClick(this: RowClickActionContext) {
      copyToClipboard(this.rowContext.groupValue as string);
      this.closeActionMenu();
    },
  },
  {
    name: i18n.translate('discover.esql_data_cascade.row.action.filter_in', {
      defaultMessage: 'Filter in',
    }),
    icon: 'plusInCircle',
    onClick(this: RowClickActionContext) {
      const updatedQuery = appendWhereClauseToESQLQuery(
        this.editorQuery.esql,
        this.rowContext.groupId,
        this.rowContext.groupValue as string,
        '+'
      );

      if (!updatedQuery) {
        return;
      }

      this.services.data.query.queryString.setQuery({
        esql: updatedQuery,
      });
    },
  },
  {
    name: i18n.translate('discover.esql_data_cascade.row.action.filter_out', {
      defaultMessage: 'Filter out',
    }),
    icon: 'minusInCircle',
    onClick(this: RowClickActionContext) {
      const updatedQuery = appendWhereClauseToESQLQuery(
        this.editorQuery.esql,
        this.rowContext.groupId,
        this.rowContext.groupValue as string,
        '-'
      );

      if (!updatedQuery) {
        return;
      }

      this.services.data.query.queryString.setQuery({
        esql: updatedQuery,
      });
    },
  },
  {
    name: i18n.translate('discover.esql_data_cascade.row.action.view_docs', {
      defaultMessage: 'Open in new discover tab',
    }),
    icon: 'discoverApp',
    renderFor: 'categorize',
    onClick(this: RowClickActionContext, e) {
      e.preventDefault();

      // @ts-expect-error -- brittle, locator exists on services, however unified table doesn't have it in its types
      const discoverLink = (this.services.locator as DiscoverAppLocator).getRedirectUrl({
        query: constructCascadeQuery({
          query: this.editorQuery,
          nodeType: 'leaf',
          nodePath: [this.rowContext.groupId],
          nodePathMap: { [this.rowContext.groupId]: this.rowContext.groupValue },
        }),
        timeRange: this.globalState.timeRange,
        hideChart: false,
      });

      window.open(discoverLink, '_blank');
    },
  },
];

interface ContextMenuProps
  extends Pick<RowClickActionContext, 'editorQuery' | 'editorQueryMeta' | 'globalState'> {
  row: RowContext;
  services: UnifiedDataTableProps['services'];
  close: RowClickActionContext['closeActionMenu'];
}

const ContextMenu = React.memo(
  ({ row, services, editorQuery, editorQueryMeta, close, globalState }: ContextMenuProps) => {
    const groupType = editorQueryMeta.groupByFields.find(
      (field) => field.field === row.groupId
    )?.type;

    const panels = useMemo<EuiContextMenuPanelDescriptor[]>(() => {
      return [
        {
          id: `${row.groupId}-${row.groupValue}-context-menu`,
          items: contextRowActions.reduce((acc, action) => {
            if (action.renderFor && action.renderFor !== groupType) {
              return acc;
            }

            return acc.concat({
              ...action,
              // @ts-expect-error - this is necessary to bind the correct context to the action
              onClick: action.onClick?.bind({
                rowContext: row,
                services,
                editorQuery,
                closeActionMenu: close,
                globalState,
              }),
            });
          }, [] as NonNullable<EuiContextMenuPanelDescriptor['items']>),
        },
      ];
    }, [close, editorQuery, globalState, groupType, row, services]);

    return <EuiContextMenu initialPanelId={panels[0].id} panels={panels} />;
  }
);

export function useEsqlDataCascadeRowHeaderComponents(
  services: UnifiedDataTableProps['services'],
  editorQuery: AggregateQuery,
  editorQueryMeta: ESQLStatsQueryMeta,
  globalState: TabStateGlobalState
) {
  const popoverRef = useRef<HTMLButtonElement | null>(null);
  const [popoverRowData, setPopoverRowData] = useState<RowContext | null>(null);

  const closePopover = useCallback(() => setPopoverRowData(null), [setPopoverRowData]);

  /**
   * Renders the popover for the row action (3 dots) button. Adopting this patterns avoids rendering multiple popovers
   * in the table which can be very expensive.
   *
   * Note: The popover content is re-created each time it is opened to ensure the context actions have access to the
   * latest props and state.
   */
  const renderRowActionPopover = useCallback(() => {
    return popoverRowData ? (
      <EuiWrappingPopover
        button={popoverRef.current!}
        isOpen={popoverRowData !== null}
        closePopover={() => setPopoverRowData(null)}
        panelPaddingSize="none"
      >
        <ContextMenu
          close={closePopover}
          editorQuery={editorQuery}
          editorQueryMeta={editorQueryMeta}
          globalState={globalState}
          row={popoverRowData!}
          services={services}
        />
      </EuiWrappingPopover>
    ) : null;
  }, [popoverRowData, closePopover, editorQuery, editorQueryMeta, globalState, services]);

  /**
   * Renders the title part of the row header.
   */
  const rowHeaderTitle = useCallback<
    NonNullable<DataCascadeRowProps<ESQLDataGroupNode, DataTableRecord>['rowHeaderTitleSlot']>
  >(
    ({ rowData, nodePath }) => {
      const rowGroup = nodePath[nodePath.length - 1];

      const type = editorQueryMeta.groupByFields.find((field) => field.field === rowGroup)!.type;

      if (/categorize/i.test(type)) {
        return (
          <React.Fragment>
            {getPatternCellRenderer(
              // @ts-expect-error - necessary to match the data shape expectation
              { flattened: rowData },
              rowGroup,
              false,
              48
            )}
          </React.Fragment>
        );
      }

      return (
        <EuiText size="s">
          <EuiTextTruncate text={(rowData[rowGroup] ?? '-') as string}>
            {(truncatedText) => {
              return <h4>{truncatedText}</h4>;
            }}
          </EuiTextTruncate>
        </EuiText>
      );
    },
    [editorQueryMeta.groupByFields]
  );

  /**
   * Renders the meta part of the row header.
   */
  const rowHeaderMeta = useCallback<
    NonNullable<DataCascadeRowProps<ESQLDataGroupNode, DataTableRecord>['rowHeaderMetaSlots']>
  >(
    ({ rowData }) =>
      editorQueryMeta.appliedFunctions.map(({ identifier }) => {
        // maybe use operator to determine what meta component to render
        return (
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <FormattedMessage
              id="discover.esql_data_cascade.grouping.function"
              defaultMessage="<bold>{identifier}: </bold><badge>{identifierValue}</badge>"
              values={{
                identifier,
                identifierValue: rowData[identifier] as string | number,
                bold: (chunks) => (
                  <EuiFlexItem grow={false}>
                    <EuiText size="s" textAlign="right">
                      <p>{chunks}</p>
                    </EuiText>
                  </EuiFlexItem>
                ),
                badge: ([chunk]) => {
                  return (
                    <EuiFlexItem grow={false}>
                      {Number.isNaN(Number(chunk)) ? (
                        <EuiBadge color="hollow">{chunk}</EuiBadge>
                      ) : (
                        <NumberBadge value={Number(chunk)} shortenAtExpSize={3} />
                      )}
                    </EuiFlexItem>
                  );
                },
              }}
            />
          </EuiFlexGroup>
        );
      }),
    [editorQueryMeta.appliedFunctions]
  );

  const rowContextActionClickHandler = useCallback(
    function showPopover(this: RowContext, e: React.MouseEvent<Element>) {
      popoverRef.current = e.currentTarget as HTMLButtonElement;
      setPopoverRowData(this);
    },
    [setPopoverRowData]
  );

  const rowActions = useCallback<
    NonNullable<DataCascadeRowProps<ESQLDataGroupNode, DataTableRecord>['rowHeaderActions']>
  >(
    ({ rowData, nodePath }) => {
      const groupId = nodePath[nodePath.length - 1];
      const groupValue = rowData[groupId] as string;

      return [
        {
          iconType: 'boxesVertical',
          'aria-label': `${rowData.id}-row-actions`,
          'data-test-subj': 'dscCascadeRowContextActionButton',
          onClick: rowContextActionClickHandler.bind({ groupId, groupValue }),
        },
      ];
    },
    [rowContextActionClickHandler]
  );

  return useMemo(
    () => ({
      rowHeaderMeta,
      rowHeaderTitle,
      rowActions,
      renderRowActionPopover,
    }),
    [renderRowActionPopover, rowActions, rowHeaderMeta, rowHeaderTitle]
  );
}
