/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React, { useMemo, useState } from 'react';
import { DataTableRecord } from '@kbn/discover-utils';
import {
  EuiAccordion,
  EuiBadge,
  EuiBetaBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiTitle,
  EuiBasicTable,
  useGeneratedHtmlId,
  EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DegradedField } from '@kbn/dataset-quality-plugin/common/api_types';
import { orderBy } from 'lodash';

type Direction = 'asc' | 'desc';
type SortField = 'issue' | 'values';

const DEFAULT_SORT_FIELD = 'issue';
const DEFAULT_SORT_DIRECTION = 'asc';
const DEFAULT_ROWS_PER_PAGE = 5;

interface TableOptions {
  page: {
    index: number;
    size: number;
  };
  sort: {
    field: SortField;
    direction: Direction;
  };
}

const DEFAULT_TABLE_OPTIONS: TableOptions = {
  page: {
    index: 0,
    size: 0,
  },
  sort: {
    field: DEFAULT_SORT_FIELD,
    direction: DEFAULT_SORT_DIRECTION,
  },
};

const qualityIssuesAccordionTitle = i18n.translate(
  'unifiedDocViewer.docView.logsOverview.accordion.title.qualityIssues',
  {
    defaultMessage: 'Quality Issues',
  }
);

const qualityIssuesAccordionTechPreviewBadge = i18n.translate(
  'unifiedDocViewer.docView.logsOverview.accordion.title.techPreview',
  {
    defaultMessage: 'TECH PREVIEW',
  }
);

const issueColumnName = i18n.translate(
  'unifiedDocViewer.docView.logsOverview.accordion.qualityIssues.table.field',
  {
    defaultMessage: 'Issue',
  }
);

const valuesColumnName = i18n.translate(
  'unifiedDocViewer.docView.logsOverview.accordion.qualityIssues.table.values',
  {
    defaultMessage: 'Values',
  }
);

const textFieldIgnored = i18n.translate(
  'unifiedDocViewer.docView.logsOverview.accordion.qualityIssues.table.textIgnored',
  {
    defaultMessage: 'field ignored',
  }
);

export const LogsOverviewDegradedFields = ({ rawDoc }: { rawDoc: DataTableRecord['raw'] }) => {
  const { ignored_field_values: ignoredFieldValues = {} } = rawDoc;
  const countOfDegradedFields = Object.keys(ignoredFieldValues)?.length;

  const columns = getDegradedFieldsColumns();
  const tableData = getDataFormattedForTable(ignoredFieldValues);

  const accordionId = useGeneratedHtmlId({
    prefix: qualityIssuesAccordionTitle,
  });

  const [tableOptions, setTableOptions] = useState<TableOptions>(DEFAULT_TABLE_OPTIONS);

  const onTableChange = (options: {
    page: { index: number; size: number };
    sort?: { field: keyof DegradedField; direction: Direction };
  }) => {
    setTableOptions({
      page: {
        index: options.page.index,
        size: options.page.size,
      },
      sort: {
        field: options.sort?.field ?? DEFAULT_SORT_FIELD,
        direction: options.sort?.direction ?? DEFAULT_SORT_DIRECTION,
      },
    });
  };

  const pagination = useMemo(
    () => ({
      pageIndex: tableOptions.page.index,
      pageSize: DEFAULT_ROWS_PER_PAGE,
      totalItemCount: tableData?.length ?? 0,
      hidePerPageOptions: true,
    }),
    [tableData, tableOptions]
  );

  const renderedItems = useMemo(() => {
    const sortedItems = orderBy(tableData, tableOptions.sort.field, tableOptions.sort.direction);
    return sortedItems.slice(
      tableOptions.page.index * DEFAULT_ROWS_PER_PAGE,
      (tableOptions.page.index + 1) * DEFAULT_ROWS_PER_PAGE
    );
  }, [tableData, tableOptions]);

  const accordionTitle = (
    <EuiFlexGroup alignItems="center" gutterSize="s" direction="row">
      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <p>{qualityIssuesAccordionTitle}</p>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBadge color="default">{countOfDegradedFields}</EuiBadge>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBetaBadge label={qualityIssuesAccordionTechPreviewBadge} color="hollow" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return countOfDegradedFields > 0 ? (
    <>
      <EuiAccordion
        id={accordionId}
        buttonContent={accordionTitle}
        paddingSize="m"
        initialIsOpen={false}
      >
        <EuiBasicTable
          tableLayout="fixed"
          columns={columns}
          items={renderedItems ?? []}
          sorting={{ sort: tableOptions.sort }}
          onChange={onTableChange}
          pagination={pagination}
          data-test-subj="LogsFlyoutQualityIssuesTable"
        />
      </EuiAccordion>
      <EuiHorizontalRule margin="xs" />
    </>
  ) : null;
};

const getDegradedFieldsColumns = (): Array<EuiBasicTableColumn<DegradedField>> => [
  {
    name: issueColumnName,
    sortable: true,
    field: 'issue',
    render: (issue: string) => {
      return (
        <>
          <b>{issue}</b>&nbsp;{textFieldIgnored}
        </>
      );
    },
  },
  {
    name: valuesColumnName,
    sortable: true,
    field: 'values',
    render: (values: string[]) => {
      return values.map((value, idx) => <EuiBadge key={idx}>{value}</EuiBadge>);
    },
  },
];

const getDataFormattedForTable = (ignoredFieldValues: Record<string, string[]>) => {
  return Object.entries(ignoredFieldValues).map(([field, values]) => ({
    issue: field,
    values,
  }));
};
