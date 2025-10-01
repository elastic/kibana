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
import {
  EuiBadge,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTextTruncate,
  EuiWrappingPopover,
} from '@elastic/eui';
import { NumberBadge, type DataCascadeRowProps } from '@kbn/shared-ux-document-data-cascade';
import type { DataTableRecord } from '@kbn/discover-utils';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { UnifiedDataTableProps } from '@kbn/unified-data-table';
import { getPatternCellRenderer } from '../../../../../../context_awareness/profile_providers/common/patterns/pattern_cell_renderer';
import type { ESQLStatsQueryMeta } from '../utils';

type ESQLDataGroupNode = DataTableRecord['flattened'] & { id: string };

interface RowContextOnClickAction {
  rowData: ESQLDataGroupNode;
  services: UnifiedDataTableProps['services'];
}

const contextRowActions: NonNullable<EuiContextMenuPanelDescriptor['items']> = [
  {
    name: i18n.translate('discover.esql_data_cascade.row.action.copy_to_clipboard', {
      defaultMessage: 'Copy to clipboard',
    }),
    icon: 'copy',
    onClick(this: RowContextOnClickAction) {},
  },
  {
    name: i18n.translate('discover.esql_data_cascade.row.action.filter_in', {
      defaultMessage: 'Filter in',
    }),
    icon: 'plusInCircle',
    onClick(this: RowContextOnClickAction) {},
  },
  {
    name: i18n.translate('discover.esql_data_cascade.row.action.filter_out', {
      defaultMessage: 'Filter out',
    }),
    icon: 'minusInCircle',
    onClick(this: RowContextOnClickAction) {},
  },
  {
    name: i18n.translate('discover.esql_data_cascade.row.action.view_docs', {
      defaultMessage: 'View docs in new tab',
    }),
    icon: 'popout',
    onClick(this: RowContextOnClickAction, e: React.MouseEvent) {
      e.preventDefault();

      // const discoverLink = this.services.locator.getRedirectUrl({
      // query: this.query,
      // timeRange: executeContext.timeRange,
      // hideChart: false,
      // });
      // window.open(discoverLink, '_blank');
    },
  },
];

const ContextMenu = React.memo(
  ({ row, services }: { row: ESQLDataGroupNode; services: UnifiedDataTableProps['services'] }) => {
    // @ts-expect-error - mismatch with onClick function signature
    const panels = useMemo<EuiContextMenuPanelDescriptor[]>(() => {
      const rowAction = {
        rowData: row,
        services,
      };

      return [
        {
          id: row.id,
          items: contextRowActions.map((action) => ({
            ...action,
            onClick: action.onClick?.bind(rowAction),
          })),
        },
      ];
    }, [row, services]);

    return <EuiContextMenu initialPanelId={panels[0].id} panels={panels} />;
  }
);

export function useEsqlDataCascadeRowHeaderComponents(
  services: UnifiedDataTableProps['services'],
  editorQueryMeta: ESQLStatsQueryMeta
) {
  const popoverRef = useRef<HTMLButtonElement | null>(null);
  const [popoverRowData, setPopoverRowData] = useState<ESQLDataGroupNode | null>(null);

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
        <ContextMenu services={services} row={popoverRowData!} />
      </EuiWrappingPopover>
    ) : null;
  }, [popoverRowData, services]);

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
          <EuiTextTruncate text={(rowData[rowGroup] ?? '-') as string} width={400}>
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
    function showPopover(this: ESQLDataGroupNode, e: React.MouseEvent<Element>) {
      popoverRef.current = e.currentTarget as HTMLButtonElement;
      setPopoverRowData(this);
    },
    [setPopoverRowData]
  );

  const rowActions = useCallback<
    NonNullable<DataCascadeRowProps<ESQLDataGroupNode, DataTableRecord>['rowHeaderActions']>
  >(
    ({ rowData }) => {
      return [
        {
          iconType: 'boxesVertical',
          'aria-label': `${rowData.id}-row-actions`,
          'data-test-subj': 'dscCascadeRowContextActionButton',
          onClick: rowContextActionClickHandler.bind(rowData),
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
