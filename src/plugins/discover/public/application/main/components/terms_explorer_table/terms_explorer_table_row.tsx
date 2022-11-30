/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiHealth,
  EuiTableRow,
  EuiFlexGrid,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiTableRowCell,
  EuiDescriptionListTitle,
  EuiDescriptionList,
} from '@elastic/eui';
import { TestColumnType, TestRowType } from './terms_explorer_table';
import { css } from '@emotion/react';
import { euiStyled } from '@kbn/kibana-react-plugin/common';

interface Props {
  row: TestRowType;
  columns: TestColumnType[];
}

const TestCountries = {
  ['NL']: { name: 'Netherlands', flag: '🇳🇱' },
  ['UK']: { name: 'United Kingdom', flag: '🇬🇧' },
};

export const TermsExplorerTableRow = ({ row, columns }: Props) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const renderCells = () => {
    return columns.map((column) => {
      const cell = row[column.field];

      let child;
      if (column.render) {
        child = column.render(row);
      } else {
        child = cell;
      }

      return (
        <EuiTableRowCell truncateText={column.truncateText} key={column.id} align={column.align}>
          {child}
        </EuiTableRowCell>
      );
    });
  };

  const ExpandedRow = () => {
    const { nationality, online } = row;
    const country = TestCountries[nationality];
    const color = online ? 'success' : 'danger';
    const label = online ? 'Online' : 'Offline';
    const listItems = [
      {
        title: 'Nationality',
        description: `${country.flag} ${country.name}`,
      },
      {
        title: 'Online',
        description: <EuiHealth color={color}>{label}</EuiHealth>,
      },
    ];

    return (
      <EuiTableRowCell colSpan={columns.length + 1}>
        <EuiDescriptionList listItems={listItems} />
      </EuiTableRowCell>
    );
  };

  return (
    <>
      <EuiTableRow>
        {renderCells()}
        <EuiTableRowCell isExpander textOnly={false}>
          <EuiButtonEmpty
            iconType={isExpanded ? 'arrowUp' : 'arrowDown'}
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded(!isExpanded)}
          />
        </EuiTableRowCell>
      </EuiTableRow>
      <EuiTableRow isExpandable isExpandedRow={isExpanded}>
        {isExpanded && <ExpandedRow />}
      </EuiTableRow>
    </>
  );
};
