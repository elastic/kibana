/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC } from 'react';

import { Chart, BarSeries, ScaleType, Settings } from '@elastic/charts';
import { EuiBadge } from '@elastic/eui';

import { useDiscoverServices } from '../../../../utils/use_discover_services';

import type {
  ChangePointsResponseTree,
  FrequentItemsHistograms,
  HistogramItem,
} from './use_change_point_detection';

interface TreeViewProps {
  frequentItemsHistograms: FrequentItemsHistograms;
  overallHistogram: HistogramItem[];
  tree: Array<ChangePointsResponseTree['root']>;
}

export const TreeView: FC<TreeViewProps> = ({
  frequentItemsHistograms,
  overallHistogram,
  tree,
}) => {
  const { theme } = useDiscoverServices();
  const chartTheme = theme.useChartsTheme();
  const chartBaseTheme = theme.useChartsBaseTheme();
  // const treeItems = useMemo(() => {
  //   let id = 1;
  //   const mapL = (d: ItemSetTreeNode): EuiTreeViewNode => {
  //     id = id + 1;
  //     return {
  //       label:
  //         `(q:${Math.round(d.quality() * 10000) / 10000})` +
  //         `(s:${d.selectedCluster()})` +
  //         Object.entries(d.itemSet.items)
  //           .map(([key, value]) => `${key}:${value.join('/')}`)
  //           .join(),
  //       id: `item_${id}`,
  //       icon: <EuiIcon size="s" type="folderClosed" />,
  //       iconWhenExpanded: <EuiIcon size="s" type="folderOpen" />,
  //       isExpanded: true,
  //       children: d.children().map(mapL),
  //     };
  //   };

  //   return (response?.tree && response?.tree.root.children().map(mapL)) ?? [];
  // }, [response?.tree]);

  return (
    <ul style={{ paddingLeft: '16px' }}>
      {tree.map((d) => {
        const label = Object.entries(d.itemSet.items).map(([key, value]) =>
          value.map((v) => (
            <EuiBadge color="default">
              {key}:{v}
            </EuiBadge>
          ))
        );
        const children = d.children();

        const id = JSON.stringify(d.itemSet.items);
        const cp = frequentItemsHistograms[id];

        const chartData = {
          ...cp,
          data:
            overallHistogram.map((o, i) => {
              const current = cp.find((d1) => d1.key_as_string === o.key_as_string) ?? {
                doc_count: 0,
              };
              return {
                ...o,
                doc_count: current.doc_count,
                other: Math.max(0, o.doc_count - current.doc_count),
              };
            }) ?? [],
        };

        return (
          <li style={{ padding: '2px 0 2px 0', listStyleType: 'disc' }}>
            {label}
            <div
              style={{
                width: '200px',
                height: '50px',
                // margin: '0px 0 16px 8px',
              }}
            >
              <Chart>
                <Settings theme={chartTheme} baseTheme={chartBaseTheme} />
                <BarSeries
                  id="Other"
                  xScaleType={ScaleType.Time}
                  yScaleType={ScaleType.Linear}
                  xAccessor={'key'}
                  yAccessors={['other']}
                  data={chartData.data}
                  stackAccessors={[0]}
                  // color={['lightblue']}
                />
                <BarSeries
                  id={`${label}`}
                  xScaleType={ScaleType.Time}
                  yScaleType={ScaleType.Linear}
                  xAccessor={'key'}
                  yAccessors={['doc_count']}
                  data={chartData.data}
                  stackAccessors={[0]}
                  color={['orange']}
                />
              </Chart>
            </div>
            {children.length > 0 && (
              <TreeView
                frequentItemsHistograms={frequentItemsHistograms}
                overallHistogram={overallHistogram}
                tree={children}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
};
