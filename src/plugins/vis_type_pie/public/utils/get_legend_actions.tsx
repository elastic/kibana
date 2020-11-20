/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { useState } from 'react';

import { i18n } from '@kbn/i18n';
import { EuiContextMenuPanelDescriptor, EuiIcon, EuiPopover, EuiContextMenu } from '@elastic/eui';
import { LegendAction, SeriesIdentifier } from '@elastic/charts';
import { ValueClickContext } from '../../../embeddable/public';
import { PieVisParams } from '../types';
import { getFormatService } from '../services';

// import { ClickTriggerEvent } from '../../../charts/public';

// this is temporary
export interface ClickTriggerEvent {
  name: 'filterBucket';
  data: ValueClickContext['data'];
}

export const getLegendActions = (
  canFilter: (data: ClickTriggerEvent | null) => Promise<boolean>,
  getFilterEventData: (series: SeriesIdentifier) => ClickTriggerEvent | null,
  onFilter: (data: ClickTriggerEvent, negate?: any) => void,
  visParams: PieVisParams
): LegendAction => {
  return ({ series }) => {
    const [popoverOpen, setPopoverOpen] = useState(false);
    const [isfilterable, setIsfilterable] = useState(true);
    const filterData = getFilterEventData(series);

    (async () => setIsfilterable(await canFilter(filterData)))();

    if (!isfilterable || !filterData) {
      return null;
    }

    let formattedTitle = '';
    if (visParams.dimensions.buckets) {
      const column = visParams.dimensions?.buckets.find(
        (bucket) => bucket.accessor === filterData.data.data[0].column
      );
      formattedTitle = getFormatService().deserialize(column?.format).convert(series.key) ?? '';
    }

    const title = formattedTitle || series.key;
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
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          marginLeft: 4,
          marginRight: 4,
        }}
        data-test-subj={`legend-${title}`}
        onKeyPress={() => undefined}
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
