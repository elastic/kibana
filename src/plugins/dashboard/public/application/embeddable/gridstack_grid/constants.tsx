/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import {
  EuiDualRange,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiText,
} from '@elastic/eui';
import { GridStackWidget } from 'gridstack/dist/types';

import GAUGE_GRAPH from './images/unique_visitors_gauge.svg';
import RESPONSE_CODE_GRAPH from './images/response_codes_graph.png';

export type ColumnOptions = 12 | 24 | 48;
export type PanelTypes = 'panel' | 'group';
export type CustomType = GridStackWidget & { type: PanelTypes };

export const GRID_CLASS = 'dshGrid';
export const HANDLE_CLASS = 'embPanel__dragger';
export const PANEL_CLASS = 'dshPanel';
export const GROUP_CLASS = 'dshPanelGroup';
export const NUM_COLUMNS = 48;
export const DEFAULT_CELL_HEIGHT = 32;
export const DEFAULT_GUTTERSIZE = 4;

type GridConfig = {
  [columns in ColumnOptions]: {
    class: string;
    cellHeight: number;
    gridHeightOffset: number;
  };
};

export const GRID_CONFIG: GridConfig = {
  12: {
    class: 'dshLayout__grid--small',
    cellHeight: DEFAULT_CELL_HEIGHT * 4,
    gridHeightOffset: 1,
  },
  24: {
    class: 'dshLayout__grid--medium',
    cellHeight: DEFAULT_CELL_HEIGHT * 2,
    gridHeightOffset: 2,
  },
  48: { class: 'dshLayout__grid--large', cellHeight: DEFAULT_CELL_HEIGHT, gridHeightOffset: 3 },
};

export const MarkdownGridPanel = () => (
  <div style={{ padding: '4px' }}>
    <EuiText>
      <h3>Sample Logs Data</h3>
      <p>
        This dashboard contains sample data for you to play with. You can view it, search it, and
        interact with the visualizations. For more information about Kibana, check our docs.
      </p>
    </EuiText>
  </div>
);

export const ControlsPanel = () => (
  <EuiFlexGroup style={{ padding: '4px' }}>
    <EuiFlexItem>
      <EuiFormRow label="Source country">
        <EuiSelect
          id={'source_country_dropdown'}
          options={[
            { value: 'default', text: 'Select...' },
            { value: 'us', text: 'US' },
          ]}
        />
      </EuiFormRow>
    </EuiFlexItem>
    <EuiFlexItem>
      <EuiFormRow label="OS">
        <EuiSelect
          id={'os_dropdown'}
          disabled={true}
          options={[{ value: 'default', text: 'Select...' }]}
          value={'Test'}
        />
      </EuiFormRow>
    </EuiFlexItem>
    <EuiFlexItem>
      <EuiFormRow label="Bytes">
        <EuiDualRange
          id={'test'}
          value={[5000, 10000]}
          min={0}
          max={20000}
          step={1000}
          onChange={() => {}}
          showInput
        />
      </EuiFormRow>
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const MetricsPanel = ({
  value,
  label,
  fontSize,
}: {
  value: string;
  label: string;
  fontSize: string;
}) => (
  <EuiText
    style={{
      fontFamily: 'Helvetica Neue',
      textAlign: 'center',
      fontSize,
    }}
  >
    <h1
      style={{
        fontSize: '4em',
        fontWeight: 600,
        marginBottom: '0px',
      }}
    >
      {value}
    </h1>
    <span>{label}</span>
  </EuiText>
);

export const UniqueVisitorsPanel = () => (
  <div style={{ height: '100%', width: '100%' }}>
    <img
      src={GAUGE_GRAPH}
      style={{
        width: 'auto',
        height: '80%',
        maxWidth: '100%',
        display: 'block',
        marginLeft: 'auto',
        marginRight: 'auto',
      }}
      alt="test"
    />
    <EuiText
      style={{
        textAlign: 'center',
      }}
    >
      Unique Visitors
    </EuiText>
  </div>
);

export const ResponseCodesPanel = () => {
  const CircleSVG = ({ color }: { color: string }) => (
    <span style={{ height: '8px', width: '8px', fill: color }}>
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="50" />
      </svg>
    </span>
  );

  const LegendItem = ({
    label,
    color,
    percent,
  }: {
    label: string;
    color: string;
    percent: string;
  }) => (
    <EuiFlexItem>
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={false}>
          <CircleSVG color={color} />
        </EuiFlexItem>
        <EuiFlexItem>{label}</EuiFlexItem>
        <EuiFlexItem grow={false}>{percent}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );

  return (
    <>
      <GraphPanel graph={RESPONSE_CODE_GRAPH} height="83%" />
      <EuiText size="xs">
        <EuiFlexGroup>
          <LegendItem label="HTTP 5xx" color="rgb(211, 96, 134)" percent="0%" />
          <LegendItem label="HTTP 4xx" color="rgb(214, 191, 87)" percent="33.333%" />
          <LegendItem label="HTTP 2xx and 3xx" color="rgb(84, 179, 153)" percent="66.667%" />
        </EuiFlexGroup>
      </EuiText>
    </>
  );
};

export const GraphPanel = ({ graph, height = '95%' }: { graph: string; height?: string }) => (
  <>
    <img
      style={{
        maxWidth: '100%',
        height,
        display: 'block',
        marginLeft: 'auto',
        marginRight: 'auto',
      }}
      src={graph}
      alt={'Alt text'}
    />
  </>
);

export const LogsTable = () => {
  const headers = [
    'Type',
    'Bytes (Total)',
    'Bytes (Last Hour)',
    'Unique Visits (Total)',
    'Unique Visitors (Last Hour)',
  ];

  const tableContents = [
    {
      type: '(empty)',
      bytes_total: '5.3MB',
      bytes_hour: '0B',
      unique_visits_total: '1,041',
      unique_visits_hour: '0',
    },
    {
      type: 'css',
      bytes_total: '2.4MB',
      bytes_hour: '0B',
      unique_visits_total: '448',
      unique_visits_hour: '0',
    },
    {
      type: 'deb',
      bytes_total: '1.9MB',
      bytes_hour: '0B',
      unique_visits_total: '305',
      unique_visits_hour: '0',
    },
    {
      type: 'gz',
      bytes_total: '2.9MB',
      bytes_hour: '0B',
      unique_visits_total: '496',
      unique_visits_hour: '0',
    },

    {
      type: 'rpm',
      bytes_total: '703.8KB',
      bytes_hour: '0B',
      unique_visits_total: '119',
      unique_visits_hour: '0',
    },
    {
      type: 'zip',
      bytes_total: '2.1MB',
      bytes_hour: '0B',
      unique_visits_total: '350',
      unique_visits_hour: '0',
    },
  ];

  const TableHeader = () => (
    <thead>
      <tr>
        {headers.map((title) => (
          <th className="euiTableHeaderCell" scope="col" role="columnheader">
            <span className="euiTableCellContent">
              <span className="euiTableCellContent__text" title={title}>
                {title}
              </span>
            </span>
          </th>
        ))}
      </tr>
    </thead>
  );

  const TableCell = ({ cellLabel, cellContent }: { cellLabel: string; cellContent: string }) => (
    <td className="euiTableRowCell euiTableRowCell--middle">
      <div className="euiTableRowCell__mobileHeader euiTableRowCell--hideForDesktop">
        {cellLabel}
      </div>
      <div className="euiTableCellContent euiTableCellContent--overflowingContent">
        {cellContent}
      </div>
    </td>
  );

  const TableContents = () => (
    <tbody>
      {tableContents.map((row) => (
        <tr className="euiTableRow">
          {Object.entries(row).map((cell) => {
            return <TableCell cellLabel={cell[0]} cellContent={cell[1]} />;
          })}
        </tr>
      ))}
    </tbody>
  );

  return (
    <>
      <EuiText size="s" style={{ paddingBottom: '5px' }}>
        <h5>[Logs] Host, Visits and Bytes Table</h5>
      </EuiText>
      <table className="euiTable euiTable--responsive">
        <TableHeader />
        <TableContents />
      </table>
    </>
  );
};
