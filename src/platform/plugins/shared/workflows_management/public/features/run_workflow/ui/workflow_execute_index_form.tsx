/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
import { i18n } from '@kbn/i18n';
import type { IEsSearchRequest, IEsSearchResponse } from '@kbn/search-types';
import { DataViewPicker } from '@kbn/unified-search-plugin/public';
import { useKibana } from '../../../hooks/use_kibana';

/**
 * Strips HTML tags from a string to safely render text content.
 * This removes the need for dangerouslySetInnerHTML while preserving the text content.
 */
function stripHtmlTags(html: string): string {
  // Create a temporary div element to parse HTML
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}

interface Document {
  '@timestamp': string;
  agent?: string;
  user?: string;
  [key: string]: unknown;
}

interface WorkflowExecuteEventFormProps {
  value: string;
  setValue: (data: string) => void;
  errors: string | null;
  setErrors: (errors: string | null) => void;
}

const flattenObject = (obj: Record<string, unknown>, prefix = ''): Record<string, unknown> => {
  const flattened: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(obj)) {
    const fieldName = prefix ? `${prefix}.${key}` : key;

    if (val && typeof val === 'object' && !Array.isArray(val)) {
      // Recursively flatten nested objects
      Object.assign(flattened, flattenObject(val as Record<string, unknown>, fieldName));
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
  const { unifiedSearch, notifications } = services;
  const { SearchBar } = unifiedSearch.ui;
  const [selectedDataView, setSelectedDataView] = useState<DataView | null>(null);
  const [dataViews, setDataViews] = useState<DataViewListItem[]>([]);
  const [documents, setDocuments] = useState<SearchHit<Document>[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<SearchHit<Document>[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [query, setQuery] = useState<Query>({ query: '', language: 'kuery' });
  const [submittedQuery, setSubmittedQuery] = useState<Query>({ query: '', language: 'kuery' });
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
          // Refresh fields to ensure they're up to date and properly loaded
          await services.dataViews.refreshFields(dataView, false, true);
          setSelectedDataView(dataView);
        }
      } catch (error) {
        setErrors(
          i18n.translate('workflows.workflowExecuteIndexForm.loadDataViewsError', {
            defaultMessage: 'Failed to load data views',
          })
        );
      }
    };

    loadDataViews();
  }, [services.dataViews, setErrors]);

  // Fetch documents based on selected data view and query
  const fetchDocuments = useCallback(async () => {
    if (!selectedDataView || !services.data) {
      setDocumentsLoading(false);
      return;
    }

    setDocumentsLoading(true);
    setErrors(null);

    try {
      const esQuery = buildEsQuery(selectedDataView, submittedQuery ? [submittedQuery] : [], []);
      const searchQuery = {
        bool: {
          must: esQuery.bool.must || [],
          filter: [
            ...(esQuery.bool.filter || []),
            {
              range: {
                '@timestamp': {
                  gte: timeRange?.from || 'now-15m',
                  lte: timeRange?.to || 'now',
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
            setDocumentsLoading(false);
          },
          error: (err) => {
            setErrors(
              err instanceof Error
                ? err.message
                : i18n.translate('workflows.workflowExecuteIndexForm.fetchDocumentsError', {
                    defaultMessage: 'Failed to fetch documents',
                  })
            );
            setDocuments([]);
            setDocumentsLoading(false);
          },
        });
    } catch (err) {
      setDocumentsLoading(false);
      setErrors(
        err instanceof Error
          ? err.message
          : i18n.translate('workflows.workflowExecuteIndexForm.buildQueryError', {
              defaultMessage: 'Failed to build query',
            })
      );
      setDocuments([]);
    }
  }, [selectedDataView, submittedQuery, services.data, setErrors, timeRange?.from, timeRange?.to]);

  // Fetch documents when data view, query, or time range changes
  useEffect(() => {
    if (selectedDataView) {
      fetchDocuments();
    }
    // Only include stable dependencies to avoid infinite loops
    // fetchDocuments is stable due to useCallback with proper deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDataView?.id, submittedQuery?.query, timeRange?.from, timeRange?.to]);

  // Handle data view selection - refreshes fields inline like Discovery does
  const handleDataViewChange = useCallback(
    async (dataViewId: string) => {
      if (!services.dataViews) return;

      try {
        const dataView = await services.dataViews.get(dataViewId);

        // Refresh fields if needed (following Discovery's pattern)
        // Only refresh if the data view has no fields loaded
        if (!dataView.fields.length) {
          try {
            await services.dataViews.refreshFields(dataView, false, true);
          } catch (refreshError) {
            // Log but don't block - fields may be partially available
            notifications.toasts.addWarning({
              title: i18n.translate('workflows.workflowExecuteIndexForm.refreshFieldsErrorTitle', {
                defaultMessage: 'Failed to refresh fields',
              }),
              text: i18n.translate('workflows.workflowExecuteIndexForm.refreshFieldsError', {
                defaultMessage: 'Some data view fields may be outdated.',
              }),
            });
          }
        }

        setSelectedDataView(dataView);
        setSelectedDocuments([]); // Clear selection when changing data view
      } catch (error) {
        setErrors(
          i18n.translate('workflows.workflowExecuteIndexForm.loadDataViewError', {
            defaultMessage: 'Failed to load data view',
          })
        );
      }
    },
    [services.dataViews, setErrors, notifications.toasts]
  );

  const handleQueryChange = useCallback(
    ({ query: newQuery, dateRange }: { query?: Query; dateRange: TimeRange }) => {
      // Only update the draft query for the SearchBar input (for autocomplete)
      // Don't trigger fetch - that happens only on submit
      if (newQuery) {
        setQuery(newQuery);
      }
      // Update time range immediately as it doesn't cause blinking
      setTimeRange(dateRange);
    },
    []
  );

  const handleQuerySubmit = useCallback(
    ({ query: newQuery, dateRange }: { query?: Query; dateRange: TimeRange }) => {
      // Update both draft and submitted query on submit
      if (newQuery) {
        setQuery(newQuery);
        setSubmittedQuery(newQuery);
      }
      setTimeRange(dateRange);
      // fetchDocuments will be triggered by useEffect when submittedQuery changes
    },
    []
  );

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
          query: submittedQuery.query,
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
        name: i18n.translate('workflows.workflowExecuteIndexForm.timestampColumn', {
          defaultMessage: 'Timestamp',
        }),
        width: '200px',
        sortable: true,
        render: (timestamp: string) => (
          <EuiText size="s">{new Date(timestamp).toLocaleString()}</EuiText>
        ),
      },
      {
        field: '_source',
        name: i18n.translate('workflows.workflowExecuteIndexForm.documentColumn', {
          defaultMessage: 'Document',
        }),
        render: (source: Document) => {
          const flattened = flattenObject(source as Record<string, unknown>);

          // Create a mock DataTableRecord-like object for formatHit
          const mockRecord = {
            raw: { _source: source },
            flattened,
            id: '', //  formatHit doesn't use ID
            isAnchor: false,
          };

          // Use formatHit to get properly formatted field pairs
          const formattedPairs =
            selectedDataView && typeof selectedDataView.getFieldByName === 'function'
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
                      <EuiDescriptionListDescription>
                        {stripHtmlTags(description || '-')}
                      </EuiDescriptionListDescription>
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
    selectable: () => true,
    selectableMessage: (selectable: boolean) =>
      !selectable
        ? i18n.translate('workflows.workflowExecuteIndexForm.documentNotSelectable', {
            defaultMessage: 'Document not selectable',
          })
        : '',
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
                label:
                  selectedDataView?.name ||
                  selectedDataView?.title ||
                  i18n.translate('workflows.workflowExecuteIndexForm.selectDataView', {
                    defaultMessage: 'Select data view',
                  }),
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
            key={selectedDataView?.id || 'no-dataview'}
            appName="workflow_management"
            useDefaultBehaviors={true}
            onQueryChange={handleQueryChange}
            onQuerySubmit={handleQuerySubmit}
            query={query}
            indexPatterns={selectedDataView ? [selectedDataView] : []}
            showDatePicker={true}
            dateRangeFrom={timeRange?.from || 'now-15m'}
            dateRangeTo={timeRange?.to || 'now'}
            showFilterBar={false}
            showSubmitButton={true}
            placeholder={i18n.translate('workflows.workflowExecuteIndexForm.searchPlaceholder', {
              defaultMessage: 'Filter your data using KQL syntax',
            })}
            data-test-subj="workflow-query-input"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {/* Error Display */}
      {errors && (
        <EuiFlexItem>
          <EuiCallOut
            announceOnMount
            title={i18n.translate('workflows.workflowExecuteIndexForm.errorTitle', {
              defaultMessage: 'Error',
            })}
            color="danger"
            iconType="error"
            size="s"
          >
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
              <EuiText size="s">
                {i18n.translate('workflows.workflowExecuteIndexForm.loadingDocuments', {
                  defaultMessage: 'Loading documents...',
                })}
              </EuiText>
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
            tableCaption={i18n.translate('workflows.workflowExecuteIndexForm.tableCaption', {
              defaultMessage: 'Documents list for workflow execution',
            })}
            data-test-subj="workflow-documents-table"
          />
        )}
      </EuiFlexItem>

      {/* Selection Summary */}
      {selectedDocuments.length > 0 && (
        <EuiFlexItem>
          <EuiCallOut
            announceOnMount
            title={i18n.translate('workflows.workflowExecuteIndexForm.documentsSelectedTitle', {
              defaultMessage: 'Documents Selected',
            })}
            color="success"
            iconType="check"
            size="s"
          >
            <EuiText size="s">
              {i18n.translate('workflows.workflowExecuteIndexForm.documentsSelectedCount', {
                defaultMessage:
                  '{count, plural, one {# document} other {# documents}} selected for workflow execution',
                values: { count: selectedDocuments.length },
              })}
            </EuiText>
          </EuiCallOut>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
