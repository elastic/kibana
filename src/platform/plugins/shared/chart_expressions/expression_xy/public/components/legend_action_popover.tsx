/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FILTER_CELL_ACTION_TYPE } from '@kbn/cell-actions/constants';
import { EuiContextMenuPanelDescriptor, EuiIcon, EuiPopover, EuiContextMenu } from '@elastic/eui';
import { useLegendAction } from '@elastic/charts';
import type { CellValueAction } from '../types';

const hasFilterCellAction = (actions: CellValueAction[]) => {
  return actions.some(({ type }) => type === FILTER_CELL_ACTION_TYPE);
};

export type LegendCellValueActions = Array<
  Omit<CellValueAction, 'execute'> & { execute: () => void }
>;

export interface LegendActionPopoverProps {
  /**
   * Determines the panels label
   */
  label: string;
  /**
   * Callback on filter value
   */
  onFilter: (param?: { negate?: boolean }) => void;
  /**
   * Compatible actions to be added to the popover actions
   */
  legendCellValueActions?: LegendCellValueActions;
}

export const LegendActionPopover: React.FunctionComponent<LegendActionPopoverProps> = ({
  label,
  onFilter,
  legendCellValueActions = [],
}) => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [ref, onClose] = useLegendAction<HTMLDivElement>();

  const panels: EuiContextMenuPanelDescriptor[] = useMemo(() => {
    const defaultFilterActions = [
      {
        id: 'filterIn',
        displayName: i18n.translate('expressionXY.legend.filterForValueButtonAriaLabel', {
          defaultMessage: 'Filter for',
        }),
        'data-test-subj': `legend-${label}-filterIn`,
        iconType: 'plusInCircle',
        execute: () => {
          setPopoverOpen(false);
          onFilter();
        },
      },
      {
        id: 'filterOut',
        displayName: i18n.translate('expressionXY.legend.filterOutValueButtonAriaLabel', {
          defaultMessage: 'Filter out',
        }),
        'data-test-subj': `legend-${label}-filterOut`,
        iconType: 'minusInCircle',
        execute: () => {
          setPopoverOpen(false);
          onFilter({ negate: true });
        },
      },
    ];

    const allActions = [
      ...(!hasFilterCellAction(legendCellValueActions) ? defaultFilterActions : []),
      ...legendCellValueActions,
    ];

    const legendCellValueActionPanelItems = allActions.map((action) => ({
      name: action.displayName,
      'data-test-subj': `legend-${label}-${action.id}`,
      icon: <EuiIcon type={action.iconType} size="m" />,
      onClick: () => {
        action.execute();
        setPopoverOpen(false);
      },
    }));

    return [
      {
        id: 'main',
        title: label,
        items: legendCellValueActionPanelItems,
      },
    ];
  }, [label, legendCellValueActions, onFilter]);

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
      data-test-subj={`legend-${label}`}
      onKeyPress={() => setPopoverOpen(!popoverOpen)}
      onClick={() => setPopoverOpen(!popoverOpen)}
      aria-label={i18n.translate('expressionXY.legend.legendActionsAria', {
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
      title={i18n.translate('expressionXY.legend.filterOptionsLegend', {
        defaultMessage: '{legendDataLabel}, filter options',
        values: { legendDataLabel: label },
      })}
    >
      <EuiContextMenu initialPanelId="main" panels={panels} />
    </EuiPopover>
  );
};
