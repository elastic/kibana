/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useEffect, useMemo } from 'react';

import { i18n } from '@kbn/i18n';
import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { EuiIcon, EuiPopover, EuiContextMenu } from '@elastic/eui';
import type { LegendAction, SeriesIdentifier } from '@elastic/charts';
import { useLegendAction } from '@elastic/charts';
import type { Datatable } from '@kbn/expressions-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { FILTER_CELL_ACTION_TYPE } from '@kbn/cell-actions/constants';
import type { IInterpreterRenderEvent } from '@kbn/expressions-plugin/common';
import type { PartitionVisParams } from '../../common/types';
import type { CellValueAction, ColumnCellValueActions, FilterEvent } from '../types';
import { getSeriesValueColumnIndex, getFilterPopoverTitle } from './filter_helpers';

const hasFilterCellAction = (actions: CellValueAction[]) => {
  return actions.some(({ type }) => type === FILTER_CELL_ACTION_TYPE);
};

export const getLegendActions = (
  canFilter: ((data: IInterpreterRenderEvent<unknown>) => Promise<boolean>) | undefined,
  getFilterEventData: (series: SeriesIdentifier) => FilterEvent | null,
  onFilter: (data: FilterEvent, negate?: any) => void,
  columnCellValueActions: ColumnCellValueActions,
  visParams: PartitionVisParams,
  visData: Datatable,
  formatter: FieldFormatsStart
): LegendAction => {
  return ({ series: [pieSeries] }) => {
    const [popoverOpen, setPopoverOpen] = useState(false);
    const [isFilterable, setIsFilterable] = useState(true);
    const filterData = useMemo(() => getFilterEventData(pieSeries), [pieSeries]);
    const columnIndex = useMemo(
      () => getSeriesValueColumnIndex(pieSeries.key, visData),
      [pieSeries]
    );
    const [ref, onClose] = useLegendAction<HTMLDivElement>();

    useEffect(() => {
      if (!canFilter || !filterData) {
        setIsFilterable(false);
        return;
      }

      (async () => setIsFilterable(await canFilter(filterData)))();
    }, [filterData]);

    if (columnIndex === -1) {
      return null;
    }

    // Don't show filter actions for computed columns
    const column = visData.columns[columnIndex];
    if (column?.isComputedColumn === true) {
      return null;
    }

    const title = getFilterPopoverTitle(
      visParams,
      visData,
      columnIndex,
      formatter.deserialize,
      // FIXME key could be a RangeKey see https://github.com/elastic/kibana/issues/153437
      pieSeries.key
    );

    const compatibleCellActions = columnCellValueActions[columnIndex] ?? [];

    const panelItems: EuiContextMenuPanelDescriptor['items'] = [];
    if (!hasFilterCellAction(compatibleCellActions) && isFilterable && filterData) {
      panelItems.push(
        {
          name: i18n.translate('expressionPartitionVis.legend.filterForValueButtonAriaLabel', {
            defaultMessage: 'Filter for',
          }),
          'data-test-subj': `legend-${title}-filterIn`,
          icon: <EuiIcon type="plusInCircle" size="m" />,
          onClick: () => {
            setPopoverOpen(false);
            onFilter(filterData);
          },
        },
        {
          name: i18n.translate('expressionPartitionVis.legend.filterOutValueButtonAriaLabel', {
            defaultMessage: 'Filter out',
          }),
          'data-test-subj': `legend-${title}-filterOut`,
          icon: <EuiIcon type="minusInCircle" size="m" />,
          onClick: () => {
            setPopoverOpen(false);
            onFilter(filterData, true);
          },
        }
      );
    }

    const columnMeta = visData.columns[columnIndex].meta;
    compatibleCellActions.forEach((action) => {
      panelItems.push({
        name: action.displayName,
        'data-test-subj': `legend-${title}-${action.id}`,
        icon: <EuiIcon type={action.iconType} size="m" />,
        onClick: () => {
          action.execute([{ columnMeta, value: pieSeries.key }]);
          setPopoverOpen(false);
        },
      });
    });

    if (panelItems.length === 0) {
      return null;
    }

    const panels: EuiContextMenuPanelDescriptor[] = [
      {
        id: 'main',
        title,
        items: panelItems,
      },
    ];

    const Button = (
      <div
        tabIndex={0}
        ref={ref}
        role="button"
        aria-pressed="false"
        css={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          marginLeft: 4,
          marginRight: 4,
        }}
        data-test-subj={`legend-${title}`}
        onKeyPress={() => setPopoverOpen(!popoverOpen)}
        onClick={() => setPopoverOpen(!popoverOpen)}
        aria-label={i18n.translate('expressionPartitionVis.legend.legendActionsAria', {
          defaultMessage: 'Legend actions',
        })}
      >
        <EuiIcon size="s" type="boxesVertical" />
      </div>
    );

    return (
      <EuiPopover
        button={Button}
        isOpen={popoverOpen}
        closePopover={() => {
          setPopoverOpen(false);
          onClose();
        }}
        panelPaddingSize="none"
        anchorPosition="upLeft"
        title={i18n.translate('expressionPartitionVis.legend.filterOptionsLegend', {
          defaultMessage: '{legendDataLabel}, filter options',
          values: { legendDataLabel: title },
        })}
      >
        <EuiContextMenu initialPanelId="main" panels={panels} />
      </EuiPopover>
    );
  };
};
