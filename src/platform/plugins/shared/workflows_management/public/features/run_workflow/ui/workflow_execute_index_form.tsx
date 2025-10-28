/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// TODO: remove eslint exception and use i18n for strings
/* eslint-disable @typescript-eslint/no-explicit-any, react/jsx-no-literals */

import {
  EuiCallOut,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiToken,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { take } from 'rxjs';
import type { DataView, DataViewListItem } from '@kbn/data-views-plugin/public';
import { formatHit } from '@kbn/discover-utils';
import { buildEsQuery, type Query, type TimeRange } from '@kbn/es-query';
import type { SearchHit } from '@kbn/es-types';
import type { IEsSearchRequest, IEsSearchResponse } from '@kbn/search-types';
import { DataViewPicker } from '@kbn/unified-search-plugin/public';
import { useKibana } from '../../../hooks/use_kibana';

interface Document {
  '@timestamp': string;
  agent?: string;
  user?: string;
  [key: string]: any;
}

interface WorkflowExecuteEventFormProps {
  value: string;
  setValue: (data: string) => void;
  errors: string | null;
  setErrors: (errors: string | null) => void;
}

const flattenObject = (obj: any, prefix = ''): Record<string, any> => {
  const flattened: Record<string, any> = {};

  for (const [key, val] of Object.entries(obj)) {
    const fieldName = prefix ? `${prefix}.${key}` : key;

    if (val && typeof val === 'object' && !Array.isArray(val)) {
      // Recursively flatten nested objects
      Object.assign(flattened, flattenObject(val, fieldName));
    } else {
      flattened[fieldName] = val;
    }
  }

  return flattened;
};

export const WorkflowExecuteIndexForm = ({
  value,
  setValue,
  errors,
  setErrors,
}: WorkflowExecuteEventFormProps): React.JSX.Element => {
  const { services } = useKibana();
  const { unifiedSearch } = services;
  const { SearchBar } = unifiedSearch.ui;
  const [selectedDataView, setSelectedDataView] = useState<DataView | null>(null);
  const [dataViews, setDataViews] = useState<DataViewListItem[]>([]);
  const [documents, setDocuments] = useState<SearchHit<Document>[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<SearchHit<Document>[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [query, setQuery] = useState<Query>({ query: '', language: 'kuery' });
  const [timeRange, setTimeRange] = useState<TimeRange>({
    from: 'now-15m',
    to: 'now',
  });

  // Load data views
  useEffect(() => {
    const loadDataViews = async () => {
      if (!services.dataViews) return;

      try {
        const dataViewsList = await services.dataViews.getIdsWithTitle();
        setDataViews(dataViewsList);

        // Set default data view (logs-* or first available)
        const defaultDataView =
          dataViewsList.find((dv: DataViewListItem) => dv.title.startsWith('logs-')) ||
          dataViewsList[0];
        if (defaultDataView) {
          const dataView = await services.dataViews.get(defaultDataView.id);
          setSelectedDataView(dataView);
        }
      } catch (error) {
        setErrors('Failed to load data views');
      }
    };

    loadDataViews();
  }, [services.dataViews, setErrors]);

  // Fetch documents based on selected data view and query
  const fetchDocuments = useCallback(async () => {
    if (!selectedDataView || !services.data) {
      return;
    }

    setDocumentsLoading(true);
    setErrors(null);

    const esQuery = buildEsQuery(selectedDataView, query ? [query] : [], []);
    const searchQuery = {
      bool: {
        must: esQuery.bool.must || [],
        filter: [
          ...(esQuery.bool.filter || []),
          {
            range: {
              '@timestamp': {
                gte: timeRange.from,
                lte: timeRange.to,
              },
            },
          },
        ],
        should: esQuery.bool.should || [],
        must_not: esQuery.bool.must_not || [],
      },
    };

    const request: IEsSearchRequest = {
      params: {
        index: selectedDataView.getIndexPattern(),
        query: searchQuery,
        size: 50,
        sort: [{ '@timestamp': { order: 'desc' } }],
        _source: ['@timestamp', 'agent', 'user', 'message', 'host.name', 'source.ip'],
      },
    };

    services.data.search
      .search<IEsSearchRequest, IEsSearchResponse<Document>>(request)
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          const hits: SearchHit<Document>[] =
            response?.rawResponse?.hits?.hits.filter(
              (hit): hit is SearchHit<Document> => !!hit._source
            ) ?? [];
          setDocuments(hits);
        },
        error: (err) => {
          setErrors(err instanceof Error ? err.message : 'Failed to fetch documents');
          setDocuments([]);
        },
        complete: () => {
          setDocumentsLoading(false);
        },
      });
  }, [selectedDataView, query, services.data, setErrors, timeRange.from, timeRange.to]);

  // Fetch documents when data view, query, or filters change
  useEffect(() => {
    if (selectedDataView) {
      fetchDocuments();
    }
  }, [selectedDataView, fetchDocuments]);

  // Handle data view selection
  const handleDataViewChange = useCallback(
    async (dataViewId: string) => {
      if (!services.dataViews) return;

      try {
        const dataView = await services.dataViews.get(dataViewId);
        setSelectedDataView(dataView);
        setSelectedDocuments([]); // Clear selection when changing data view
      } catch (error) {
        setErrors('Failed to load data view');
      }
    },
    [services.dataViews, setErrors]
  );

  const handleQueryChange = ({
    query: newQuery,
    dateRange,
  }: {
    query?: Query;
    dateRange: TimeRange;
  }) => {
    if (newQuery) {
      setQuery(newQuery);
    }
    setTimeRange(dateRange);
  };

  // Handle document selection
  const handleDocumentSelection = (selectedItems: SearchHit<Document>[]) => {
    setSelectedDocuments(selectedItems);

    if (selectedItems.length > 0) {
      // Create workflow event from selected documents
      const eventData = {
        event: {
          documents: selectedItems.map((doc) => ({
            id: doc._id,
            index: doc._index,
            timestamp: doc._source['@timestamp'],
            data: doc._source,
          })),
          query: query.query,
          dataView: selectedDataView?.title,
        },
      };

      setValue(JSON.stringify(eventData, null, 2));
    } else {
      setValue('');
    }
  };

  // Table columns configuration
  const columns = useMemo(
    () => [
      {
        field: '_source.@timestamp',
        name: 'timestamp',
        width: '200px',
        sortable: true,
        render: (timestamp: string) => (
          <EuiText size="s">{new Date(timestamp).toLocaleString()}</EuiText>
        ),
      },
      {
        field: '_source',
        name: 'Document',
        render: (source: any) => {
          const flattened = flattenObject(source);

          // Create a mock DataTableRecord-like object for formatHit
          const mockRecord = {
            raw: { _source: source },
            flattened,
            id: source && source._id ? source._id : undefined,
            isAnchor: false,
          };

          // Use formatHit to get properly formatted field pairs
          const formattedPairs = selectedDataView
            ? formatHit(
                mockRecord,
                selectedDataView,
                () => true, // Show all fields
                10, // Max entries
                services.fieldFormats
              )
            : [];

          return (
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiToken iconType="tokenString" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiDescriptionList type="inline">
                  {formattedPairs.map(([title, description], index) => (
                    <React.Fragment key={index}>
                      <EuiDescriptionListTitle>{title}</EuiDescriptionListTitle>
                      <EuiDescriptionListDescription
                        dangerouslySetInnerHTML={{ __html: description || '-' }}
                      />
                    </React.Fragment>
                  ))}
                </EuiDescriptionList>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      },
    ],
    [selectedDataView, services.fieldFormats]
  );

  // Table selection configuration
  const selection = {
    onSelectionChange: handleDocumentSelection,
    selectable: (item: SearchHit<Document>) => true,
    selectableMessage: (selectable: boolean) => (!selectable ? 'Document not selectable' : ''),
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiSpacer size="s" />
      <EuiFlexGroup direction="row" gutterSize="s">
        {/* Data View Selector */}
        <EuiFlexItem grow={false}>
          <EuiPanel paddingSize="s" hasBorder={false} hasShadow={false} color="transparent">
            <DataViewPicker
              trigger={{
                'data-test-subj': 'workflow-data-view-selector',
                label: selectedDataView?.name || selectedDataView?.title || 'Select data view',
                fullWidth: true,
                size: 's',
              }}
              savedDataViews={dataViews}
              currentDataViewId={selectedDataView?.id}
              onChangeDataView={handleDataViewChange}
            />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <SearchBar
            appName="workflow_management"
            onQuerySubmit={handleQueryChange}
            query={query}
            indexPatterns={selectedDataView ? [selectedDataView] : []}
            showDatePicker={true}
            dateRangeFrom={timeRange.from}
            dateRangeTo={timeRange.to}
            showFilterBar={false}
            showSubmitButton={true}
            placeholder="Filter your data using KQL syntax"
            data-test-subj="workflow-query-input"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {/* Error Display */}
      {errors && (
        <EuiFlexItem>
          <EuiCallOut announceOnMount title="Error" color="danger" iconType="error" size="s">
            <p>{errors}</p>
          </EuiCallOut>
        </EuiFlexItem>
      )}

      {/* Documents Table */}
      <EuiFlexItem>
        {documentsLoading ? (
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="m" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s">Loading documents...</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <EuiInMemoryTable
            items={documents}
            columns={columns}
            selection={selection}
            sorting={{
              sort: {
                field: '_source.@timestamp',
                direction: 'desc',
              },
            }}
            tableLayout="fixed"
            itemId="_id"
            data-test-subj="workflow-documents-table"
          />
        )}
      </EuiFlexItem>

      {/* Selection Summary */}
      {selectedDocuments.length > 0 && (
        <EuiFlexItem>
          <EuiCallOut
            announceOnMount
            title="Documents Selected"
            color="success"
            iconType="check"
            size="s"
          >
            <EuiText size="s">
              {selectedDocuments.length} document(s) selected for workflow execution
            </EuiText>
          </EuiCallOut>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
