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
import { LegendAction, SeriesIdentifier, useLegendAction } from '@elastic/charts';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { Datatable } from '@kbn/expressions-plugin/public';
import { getFormatByAccessor, getAccessor } from '@kbn/visualizations-plugin/common/utils';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { PartitionVisParams } from '../../common/types';
import { FilterEvent } from '../types';

export const getLegendActions = (
  canFilter: (
    data: FilterEvent | null,
    actions: DataPublicPluginStart['actions']
  ) => Promise<boolean>,
  getFilterEventData: (series: SeriesIdentifier) => FilterEvent | null,
  onFilter: (data: FilterEvent, negate?: any) => void,
  visParams: PartitionVisParams,
  visData: Datatable,
  actions: DataPublicPluginStart['actions'],
  formatter: FieldFormatsStart
): LegendAction => {
  return ({ series: [pieSeries] }) => {
    const [popoverOpen, setPopoverOpen] = useState(false);
    const [isfilterable, setIsfilterable] = useState(true);
    const filterData = useMemo(() => getFilterEventData(pieSeries), [pieSeries]);
    const [ref, onClose] = useLegendAction<HTMLDivElement>();

    useEffect(() => {
      (async () => setIsfilterable(await canFilter(filterData, actions)))();
    }, [filterData]);

    if (!isfilterable || !filterData) {
      return null;
    }

    let formattedTitle = '';
    if (visParams.dimensions.buckets) {
      const accessor = visParams.dimensions.buckets.find(
        (bucket) => getAccessor(bucket) === filterData.data.data[0].column
      );
      formattedTitle =
        formatter
          .deserialize(accessor ? getFormatByAccessor(accessor, visData.columns) : undefined)
          .convert(pieSeries.key) ?? '';
    }

    const title = formattedTitle || pieSeries.key;
    const panels: EuiContextMenuPanelDescriptor[] = [
      {
        id: 'main',
        title: `${title}`,
        items: [
          {
            name: i18n.translate('expressionPartitionVis.legend.filterForValueButtonAriaLabel', {
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
            name: i18n.translate('expressionPartitionVis.legend.filterOutValueButtonAriaLabel', {
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
