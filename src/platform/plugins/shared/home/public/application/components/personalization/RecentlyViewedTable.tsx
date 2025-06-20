/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import {
  formatDate,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiTableFieldDataColumnType,
  EuiLink,
  EuiHealth,
  EuiPanel,
} from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

type PersonalRecentlyViewedTable = {
  id: string;
  name: string | null | undefined;
  link: any;
  lastAccessed?: number;
};
interface RecentlyAccessedTableProps {
  recentlyAccessed: any;
  addBasePath: (path: string) => string;
}

export const PersonalizedRecentlyViewed = ({
  recentlyAccessed,
  addBasePath,
}: RecentlyAccessedTableProps) => {
  console.log('PersonalizedRecentlyViewed', { recentlyAccessed });
  const items: PersonalRecentlyViewedTable[] = recentlyAccessed.map((recentlyAccessed: any) => {
    return {
      id: recentlyAccessed.id,
      name: recentlyAccessed.label,
      link: recentlyAccessed.link,
      lastAccessed: recentlyAccessed.lastAccessed,
    };
  });

  const columns: Array<EuiBasicTableColumn<PersonalRecentlyViewedTable>> = [
    {
      field: 'name',
      name: 'Name',
      'data-test-subj': 'nameCell',

      render: (name, item) => <EuiLink href={addBasePath(item.link)}>{name}</EuiLink>,
    },
    {
      field: 'lastAccessed',
      name: 'Last Viewed',
      'data-test-subj': 'lastAccessedCell',
      render: (lastAccessed: number | undefined) => {
        if (!lastAccessed) return '-';
        return formatDate(lastAccessed, 'D MMM YYYY');
      },
      sortable: true,
    },
  ];

  const getRowProps = (personalDashboards: PersonalRecentlyViewedTable) => {
    const { id } = recentlyAccessed;
    return {
      'data-test-subj': `row-${id}`,
      className: 'customRowClass',
      onClick: () => {},
    };
  };

  const getCellProps = (
    personalDashboards: PersonalRecentlyViewedTable,
    column: EuiTableFieldDataColumnType<PersonalRecentlyViewedTable>
  ) => {
    const { id } = recentlyAccessed;
    const { field } = column;
    return {
      className: 'customCellClass',
      'data-test-subj': `cell-${id}-${String(field)}`,
      textOnly: true,
    };
  };

  return (
    <KibanaPageTemplate.Section
      bottomBorder
      paddingSize="xl"
      aria-labelledby="homeSolutions__title"
    >
      <EuiPanel paddingSize="m" style={{ maxWidth: '50%' }}>
        <EuiBasicTable
          tableCaption="Recently Viewed Items"
          responsiveBreakpoint={false}
          items={items}
          rowHeader="name"
          columns={columns}
          rowProps={getRowProps}
          cellProps={getCellProps}
        />
      </EuiPanel>
    </KibanaPageTemplate.Section>
  );
};
