/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiContextMenuPanelDescriptor,
  EuiIcon,
  EuiPopover,
  EuiContextMenu,
  EuiContextMenuPanelItemDescriptor,
} from '@elastic/eui';
import { useLegendAction } from '@elastic/charts';
import type { CellValueAction } from '../types';
import { shouldShowLegendActionDefault } from '../../common/helpers/visualization';

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
  shouldShowLegendAction?: (actionId: string) => boolean;
}

export const LegendActionPopover: React.FunctionComponent<LegendActionPopoverProps> = ({
  label,
  onFilter,
  legendCellValueActions = [],
  shouldShowLegendAction = shouldShowLegendActionDefault,
}) => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [ref, onClose] = useLegendAction<HTMLDivElement>();

  const panels: EuiContextMenuPanelDescriptor[] = useMemo(() => {
    const defaultActions = [
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

    const legendCellValueActionPanelItems = [...defaultActions, ...legendCellValueActions].reduce<
      EuiContextMenuPanelItemDescriptor[]
    >((acc, action) => {
      if (shouldShowLegendAction(action.id)) {
        acc.push({
          name: action.displayName,
          'data-test-subj': `legend-${label}-${action.id}`,
          icon: <EuiIcon type={action.iconType} size="m" />,
          onClick: () => {
            action.execute();
            setPopoverOpen(false);
          },
        });
      }
      return acc;
    }, []);
    return [
      {
        id: 'main',
        title: label,
        items: legendCellValueActionPanelItems,
      },
    ];
  }, [label, legendCellValueActions, onFilter, shouldShowLegendAction]);

  const Button = (
    <div
      tabIndex={0}
      ref={ref}
      role="button"
      aria-pressed="false"
      style={{
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
