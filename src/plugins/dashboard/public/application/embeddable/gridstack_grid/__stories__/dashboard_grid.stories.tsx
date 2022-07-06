/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { EuiPanel } from '@elastic/eui';
// import 'gridstack/dist/h5/gridstack-dd-native';
import { Grid } from '../components/grid';
import { smallGridData, mediumGridData, largeGridData } from './fixtures';

import {
  MarkdownGridPanel,
  ControlsPanel,
  MetricsPanel,
  UniqueVisitorsPanel,
  ResponseCodesPanel,
  GraphPanel,
  LogsTable,
} from '../constants';

import SANKEY_CHART_GRAPH from '../images/sankey_chart.png';
import DESTINATION_HEATMAP from '../images/destination_heatmap.png';
import REQUEST_MAP from '../images/total_requests_map.png';
import BYTES_BAR_GRAPH from '../images/bytes_bar_graph.png';
import { ControlledStack } from '../components/basic_react_demos/test_react_grid_demo';
import { StyledSubgridDemo } from '../components/styled_subgrid_demo';
import { SubgridDemo } from '../components/basic_react_demos/test_subgrid_demo';

export default {
  component: EuiPanel,
  title: 'POC - Gridstack',
  description: 'POC of new grid layout system',
  argTypes: {},
};

export const BasicReactExample = () => {
  return <ControlledStack />;
};

export const NestedReactExample = () => {
  return <SubgridDemo />;
};

export const LogsDashboardExample = () => {
  const gridData = [
    {
      x: 0,
      y: 0,
      w: 17,
      h: 6,
      id: '343f0bef-0b19-452e-b1c8-59beb18b6f0c',
      render: () => <MarkdownGridPanel />,
    },
    {
      x: 17,
      y: 0,
      w: 31,
      h: 6,
      id: '30326cdb-4ddd-49eb-a4f1-b555caa21d7c',
      render: () => <ControlsPanel />,
    },
    {
      x: 0,
      y: 6,
      w: 12,
      h: 8,
      id: 'bb94016e-f4a6-49ca-87a9-296a2869d570',
      render: () => <MetricsPanel value="2,777" label="Visits" fontSize="22px" />,
    },
    {
      x: 12,
      y: 6,
      w: 12,
      h: 8,
      id: '11',
      render: () => <UniqueVisitorsPanel />,
    },
    {
      x: 24,
      y: 6,
      w: 24,
      h: 13,
      id: '15',
      title: '[Logs] Response Codes Over Time + Annotations',
      render: () => <ResponseCodesPanel title="[Logs] Response Codes Over Time + Annotations" />,
    },
    {
      x: 0,
      y: 14,
      w: 12,
      h: 5,
      id: '01d8e435-91c0-484f-a11e-856747050b0a',
      render: () => <MetricsPanel value="4.4%" label="HTTP 4xx" fontSize="12px" />,
    },
    {
      x: 12,
      y: 14,
      w: 12,
      h: 5,
      id: '8c1456d4-1993-4ba2-b701-04aca02c9fef',
      render: () => <MetricsPanel value="3.4%" label="HTTP 5xx" fontSize="12px" />,
    },
    {
      x: 0,
      y: 19,
      w: 24,
      h: 18,
      id: '20',
      title: '[Logs] Total Requests and Bytes',
      render: () => <GraphPanel graph={REQUEST_MAP} />,
    },
    {
      x: 24,
      y: 19,
      w: 24,
      h: 33,
      id: '14',
      title: '[Logs] Machine OS and Destination Sankey Chart',
      render: () => <GraphPanel graph={SANKEY_CHART_GRAPH} />,
    },
    {
      x: 0,
      y: 37,
      w: 24,
      h: 15,
      id: '8e59c7cf-6e42-4343-a113-c4a255fcf2ce',
      title: '[Logs] Unique Destination Heatmap',
      render: () => <GraphPanel graph={DESTINATION_HEATMAP} height="94%" />,
    },
    {
      x: 0,
      y: 52,
      w: 24,
      h: 13,
      id: '9',
      title: '[Logs] Host, Visits and Bytes Table',
      render: () => <LogsTable />,
    },

    {
      x: 24,
      y: 52,
      w: 24,
      h: 13,
      id: '10',
      title: '[Logs] Bytes distribution',
      render: () => <GraphPanel graph={BYTES_BAR_GRAPH} height="93%" />,
    },
  ];

  return <Grid columns={48} gridData={gridData} />;
};

export const Columns48GridExample = () => {
  return <Grid columns={48} gridData={largeGridData} />;
};

export const Columns24GridExample = () => {
  return <Grid columns={24} gridData={mediumGridData} />;
};

export const Columns12GridExample = () => {
  return <Grid columns={12} gridData={smallGridData} />;
};

export const PanelGroupExample = () => {
  return <StyledSubgridDemo />;
};

export const EmptyExample = () => {
  return <Grid columns={24} />;
};

export const SimpleNestedExample = () => {
  return (
    <Grid
      columns={24}
      gridData={[
        {
          id: 'panel-group',
          x: 0,
          y: 0,
          w: 24,
          h: 6,
          content: 'panel-group',
          subGrid: {
            acceptWidgets: true,
            float: false,
            cellHeight: `${64}px`,
            margin: 4,
            minRow: 6,
            column: 24,
            children: [{ id: 'nested-panel', x: 0, y: 0, w: 6, h: 3, content: 'nested-panel' }],
          },
        },
        { id: 'panel1', x: 0, y: 7, w: 6, h: 3, content: 'panel1' },
      ]}
    />
  );
};

export const NestedGridsExample = () => {
  const gridData = [
    {
      id: 'regular',
      y: 0,
      content: 'regular item',
      x: 0,
      w: 1,
      h: 1,
    },
    {
      id: 'sub1',
      x: 1,
      w: 4,
      h: 4,
      subGrid: {
        dragOut: true,
        class: 'sub1',
        cellHeight: 50,
        column: 12,
        acceptWidgets: true,
        margin: 5,
        children: [
          {
            id: '0',
            x: 0,
            y: 0,
            content: '0',
            w: 1,
            h: 1,
          },
          {
            id: '1',
            x: 1,
            y: 0,
            content: '1',
            w: 1,
            h: 1,
          },
          {
            id: '2',
            x: 2,
            y: 0,
            content: '2',
            w: 1,
            h: 1,
          },
          {
            id: '3',
            x: 3,
            y: 0,
            content: '3',
            w: 1,
            h: 1,
          },
          {
            id: '4',
            x: 0,
            y: 1,
            content: '4',
            w: 1,
            h: 1,
          },
          {
            id: '5',
            x: 1,
            y: 1,
            content: '5',
            w: 1,
            h: 1,
          },
        ],
      },
      y: 0,
    },
    {
      id: 'sub2',
      x: 5,
      w: 3,
      h: 4,
      y: 0,
      subGrid: {
        class: 'sub2',
        cellHeight: 50,
        column: 12,
        acceptWidgets: true,
        margin: 5,
        children: [
          {
            id: '6',
            x: 0,
            y: 0,
            content: '6',
            w: 1,
            h: 1,
          },
          {
            id: '7',
            x: 0,
            y: 1,
            w: 2,
            content: '7',
            h: 1,
          },
        ],
      },
    },
  ];
  return <Grid columns={12} gridData={gridData} />;
};
