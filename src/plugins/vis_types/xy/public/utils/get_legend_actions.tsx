/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect, useMemo } from 'react';

import { i18n } from '@kbn/i18n';
import { EuiContextMenuPanelDescriptor, EuiIcon, EuiPopover, EuiContextMenu } from '@elastic/eui';
import {
  LegendAction,
  XYChartSeriesIdentifier,
  SeriesName,
  useLegendAction,
} from '@elastic/charts';

import { ClickTriggerEvent } from '@kbn/charts-plugin/public';

export const getLegendActions = (
  canFilter: (data: ClickTriggerEvent | null) => Promise<boolean>,
  getFilterEventData: (series: XYChartSeriesIdentifier) => ClickTriggerEvent | null,
  onFilter: (data: ClickTriggerEvent, negate?: any) => void,
  getSeriesName: (series: XYChartSeriesIdentifier) => SeriesName
): LegendAction => {
  return ({ series: [xySeries] }) => {
    const [popoverOpen, setPopoverOpen] = useState(false);
    const [isfilterable, setIsfilterable] = useState(false);
    const series = xySeries as XYChartSeriesIdentifier;
    const filterData = useMemo(() => getFilterEventData(series), [series]);
    const [ref, onClose] = useLegendAction<HTMLDivElement>();

    useEffect(() => {
      (async () => setIsfilterable(await canFilter(filterData)))();
    }, [filterData]);

    if (!isfilterable || !filterData) {
      return null;
    }

    const name = getSeriesName(series);
    const panels: EuiContextMenuPanelDescriptor[] = [
      {
        id: 'main',
        title: `${name}`,
        items: [
          {
            name: i18n.translate('visTypeXy.legend.filterForValueButtonAriaLabel', {
              defaultMessage: 'Filter for value',
            }),
            'data-test-subj': `legend-${name}-filterIn`,
            icon: <EuiIcon type="plusInCircle" size="m" />,
            onClick: () => {
              setPopoverOpen(false);
              onFilter(filterData);
            },
          },
          {
            name: i18n.translate('visTypeXy.legend.filterOutValueButtonAriaLabel', {
              defaultMessage: 'Filter out value',
            }),
            'data-test-subj': `legend-${name}-filterOut`,
            icon: <EuiIcon type="minusInCircle" size="m" />,
            onClick: () => {
              setPopoverOpen(false);
              onFilter(filterData, true);
            },
          },
        ],
      },
    ];

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
        data-test-subj={`legend-${name}`}
        onKeyPress={() => setPopoverOpen(!popoverOpen)}
        onClick={() => setPopoverOpen(!popoverOpen)}
      >
        <EuiIcon size="s" type="boxesVertical" />
      </div>
    );

    return (
      <EuiPopover
        id="contextMenuNormal"
        button={Button}
        isOpen={popoverOpen}
        closePopover={() => {
          setPopoverOpen(false);
          onClose();
        }}
        panelPaddingSize="none"
        anchorPosition="upLeft"
        title={i18n.translate('visTypeXy.legend.filterOptionsLegend', {
          defaultMessage: '{legendDataLabel}, filter options',
          values: { legendDataLabel: name },
        })}
      >
        <EuiContextMenu initialPanelId="main" panels={panels} />
      </EuiPopover>
    );
  };
};
