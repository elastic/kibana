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
import { LegendAction, SeriesIdentifier } from '@elastic/charts';
import { DataPublicPluginStart } from '../../../../data/public';
import { PieVisParams } from '../types';
import { ClickTriggerEvent } from '../../../../charts/public';

export const getLegendActions = (
  canFilter: (
    data: ClickTriggerEvent | null,
    actions: DataPublicPluginStart['actions']
  ) => Promise<boolean>,
  getFilterEventData: (series: SeriesIdentifier) => ClickTriggerEvent | null,
  onFilter: (data: ClickTriggerEvent, negate?: any) => void,
  visParams: PieVisParams,
  actions: DataPublicPluginStart['actions'],
  formatter: DataPublicPluginStart['fieldFormats']
): LegendAction => {
  return ({ series: [pieSeries] }) => {
    const [popoverOpen, setPopoverOpen] = useState(false);
    const [isfilterable, setIsfilterable] = useState(true);
    const filterData = useMemo(() => getFilterEventData(pieSeries), [pieSeries]);

    useEffect(() => {
      (async () => setIsfilterable(await canFilter(filterData, actions)))();
    }, [filterData]);

    if (!isfilterable || !filterData) {
      return null;
    }

    let formattedTitle = '';
    if (visParams.dimensions.buckets) {
      const column = visParams.dimensions.buckets.find(
        (bucket) => bucket.accessor === filterData.data.data[0].column
      );
      formattedTitle = formatter.deserialize(column?.format).convert(pieSeries.key) ?? '';
    }

    const title = formattedTitle || pieSeries.key;
    const panels: EuiContextMenuPanelDescriptor[] = [
      {
        id: 'main',
        title: `${title}`,
        items: [
          {
            name: i18n.translate('visTypePie.legend.filterForValueButtonAriaLabel', {
              defaultMessage: 'Filter for value',
            }),
            'data-test-subj': `legend-${title}-filterIn`,
            icon: <EuiIcon type="plusInCircle" size="m" />,
            onClick: () => {
              setPopoverOpen(false);
              onFilter(filterData);
            },
          },
          {
            name: i18n.translate('visTypePie.legend.filterOutValueButtonAriaLabel', {
              defaultMessage: 'Filter out value',
            }),
            'data-test-subj': `legend-${title}-filterOut`,
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
        data-test-subj={`legend-${title}`}
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
        closePopover={() => setPopoverOpen(false)}
        panelPaddingSize="none"
        anchorPosition="upLeft"
        title={i18n.translate('visTypePie.legend.filterOptionsLegend', {
          defaultMessage: '{legendDataLabel}, filter options',
          values: { legendDataLabel: title },
        })}
      >
        <EuiContextMenu initialPanelId="main" panels={panels} />
      </EuiPopover>
    );
  };
};
