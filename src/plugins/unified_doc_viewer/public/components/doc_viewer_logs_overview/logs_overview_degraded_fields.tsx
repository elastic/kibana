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
  EuiHeaderLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { orderBy } from 'lodash';
import { getRouterLinkProps } from '@kbn/router-utils';
import { DATA_QUALITY_LOCATOR_ID, DataQualityLocatorParams } from '@kbn/deeplinks-observability';
import { BrowserUrlService } from '@kbn/share-plugin/public';
import { getUnifiedDocViewerServices } from '../../plugin';

type Direction = 'asc' | 'desc';
type SortField = 'issue' | 'values';

const DEFAULT_SORT_FIELD = 'issue';
const DEFAULT_SORT_DIRECTION = 'asc';
const DEFAULT_ROWS_PER_PAGE = 5;

interface DegradedField {
  issue: string;
  values: string[];
}

interface ParamsForLocator {
  dataStreamType: string;
  dataStreamName: string;
  dataStreamNamespace: string;
  rawName: string;
}

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

export const datasetQualityLinkTitle = i18n.translate(
  'unifiedDocViewer.docView.logsOverview.accordion.qualityIssues.table.datasetQualityLinkTitle',
  {
    defaultMessage: 'Data set details',
  }
);

export const LogsOverviewDegradedFields = ({ rawDoc }: { rawDoc: DataTableRecord['raw'] }) => {
  const { ignored_field_values: ignoredFieldValues = {}, fields: sourceFields = {} } = rawDoc;
  const countOfDegradedFields = Object.keys(ignoredFieldValues)?.length;

  const columns = getDegradedFieldsColumns();
  const tableData = getDataFormattedForTable(ignoredFieldValues);

  const paramsForLocator = getParamsForLocator(sourceFields);

  const accordionId = useGeneratedHtmlId({
    prefix: qualityIssuesAccordionTitle,
  });

  const [tableOptions, setTableOptions] = useState<TableOptions>(DEFAULT_TABLE_OPTIONS);

  const onTableChange = (options: {
    page: { index: number; size: number };
    sort?: { field: SortField; direction: Direction };
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

  const { share } = getUnifiedDocViewerServices();
  const { url: urlService } = share;

  const accordionTitle = (
    <EuiFlexGroup alignItems="center" gutterSize="s" direction="row">
      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <p>{qualityIssuesAccordionTitle}</p>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBadge
          color="default"
          data-test-subj="unifiedDocViewLogsOverviewDegradedFieldTitleCount"
        >
          {countOfDegradedFields}
        </EuiBadge>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBetaBadge
          label={qualityIssuesAccordionTechPreviewBadge}
          color="hollow"
          data-test-subj="unifiedDocViewLogsOverviewDegradedFieldsTechPreview"
        />
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
        extraAction={
          <DatasetQualityLink urlService={urlService} paramsForLocator={paramsForLocator} />
        }
        data-test-subj="unifiedDocViewLogsOverviewDegradedFieldsAccordion"
      >
        <EuiBasicTable
          tableLayout="fixed"
          columns={columns}
          items={renderedItems ?? []}
          sorting={{ sort: tableOptions.sort }}
          onChange={onTableChange}
          pagination={pagination}
          data-test-subj="unifiedDocViewLogsOverviewDegradedFieldsQualityIssuesTable"
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

const getDataFormattedForTable = (
  ignoredFieldValues: Record<string, string[]>
): DegradedField[] => {
  return Object.entries(ignoredFieldValues).map(([field, values]) => ({
    issue: field,
    values,
  }));
};

const getParamsForLocator = (
  sourceFields: DataTableRecord['raw']['fields']
): ParamsForLocator | undefined => {
  if (sourceFields) {
    const dataStreamTypeArr = sourceFields['data_stream.type'];
    const dataStreamType = dataStreamTypeArr ? dataStreamTypeArr[0] : undefined;
    const dataStreamNameArr = sourceFields['data_stream.dataset'];
    const dataStreamName = dataStreamNameArr ? dataStreamNameArr[0] : undefined;
    const dataStreamNamespaceArr = sourceFields['data_stream.namespace'];
    const dataStreamNamespace = dataStreamNamespaceArr ? dataStreamNamespaceArr[0] : undefined;
    let rawName;

    if (dataStreamType && dataStreamName && dataStreamNamespace) {
      rawName = `${dataStreamType}-${dataStreamName}-${dataStreamNamespace}`;
    }

    if (rawName) {
      return {
        dataStreamType,
        dataStreamName,
        dataStreamNamespace,
        rawName,
      };
    }
  }
};

const DatasetQualityLink = React.memo(
  ({
    urlService,
    paramsForLocator,
  }: {
    urlService: BrowserUrlService;
    paramsForLocator?: ParamsForLocator;
  }) => {
    const locator = urlService.locators.get<DataQualityLocatorParams>(DATA_QUALITY_LOCATOR_ID);
    const locatorParams: DataQualityLocatorParams = paramsForLocator
      ? {
          flyout: {
            dataset: {
              rawName: paramsForLocator.rawName,
              type: paramsForLocator.dataStreamType,
              name: paramsForLocator.dataStreamName,
              namespace: paramsForLocator.dataStreamNamespace,
            },
          },
        }
      : {};

    const datasetQualityUrl = locator?.getRedirectUrl(locatorParams);

    const navigateToDatasetQuality = () => {
      locator?.navigate(locatorParams);
    };

    const datasetQualityLinkProps = getRouterLinkProps({
      href: datasetQualityUrl,
      onClick: navigateToDatasetQuality,
    });

    return paramsForLocator ? (
      <EuiHeaderLink
        {...datasetQualityLinkProps}
        color="primary"
        data-test-subj="unifiedDocViewLogsOverviewDegradedFieldDatasetLink"
        iconType="popout"
        target="_blank"
      >
        {datasetQualityLinkTitle}
      </EuiHeaderLink>
    ) : null;
  }
);
