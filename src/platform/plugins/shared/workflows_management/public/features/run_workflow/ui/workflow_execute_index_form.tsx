/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiInMemoryTable,
  EuiIcon,
  EuiButton,
  EuiCallOut,
  EuiComboBox,
  EuiFieldText,
  EuiToken,
  EuiDescriptionList,
  EuiFormRow,
} from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { DataView, DataViewListItem } from '@kbn/data-views-plugin/public';
import type { AuthenticatedUser } from '@kbn/security-plugin-types-common';
import type { SecurityServiceStart } from '@kbn/core-security-browser';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { css } from '@emotion/react';
import type { WorkflowsPluginStartDependencies } from '../../../types';

interface Document {
  _id: string;
  _index: string;
  _source: {
    '@timestamp': string;
    agent?: string;
    user?: string;
    [key: string]: any;
  };
}

interface DocumentsResponse {
  rawResponse: {
    hits: {
      hits: Document[];
      total: number;
    };
  };
}

interface WorkflowExecuteEventFormProps {
  value: string;
  setValue: (data: string) => void;
  errors: string | null;
  setErrors: (errors: string | null) => void;
}

const getCurrentUser = async (security: SecurityServiceStart) => {
  try {
    if (security) {
      return await security.authc.getCurrentUser();
    }
  } catch (error) {
    // console.error(error);
  }
  return null;
};

export const WorkflowExecuteIndexForm = ({
  value,
  setValue,
  errors,
  setErrors,
}: WorkflowExecuteEventFormProps): React.JSX.Element => {
  const { services } = useKibana<CoreStart & WorkflowsPluginStartDependencies>();
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  const [selectedDataView, setSelectedDataView] = useState<DataView | null>(null);
  const [dataViews, setDataViews] = useState<DataViewListItem[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<Document[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [queryString, setQueryString] = useState<string>('');

  // Get current user
  useEffect(() => {
    if (!services.security) {
      setErrors('Security service not available');
      return;
    }
    getCurrentUser(services.security).then((user: AuthenticatedUser | null): void => {
      setCurrentUser(user);
    });
  }, [services.security, setErrors]);

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
    if (!selectedDataView || !services.http) {
      return;
    }

    setDocumentsLoading(true);
    setErrors(null);

    try {
      const searchQuery = {
        bool: {
          must: [...(queryString ? [{ query_string: { query: queryString } }] : [])],
          filter: [
            {
              range: {
                '@timestamp': {
                  gte: 'now-24h',
                  lte: 'now',
                },
              },
            },
          ],
        },
      };

      const { rawResponse: response } = await services.http.post<DocumentsResponse>(
        `/internal/search/es`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Elastic-Api-Version': '1',
          },
          body: JSON.stringify({
            index: selectedDataView.title,
            body: {
              query: searchQuery,
              size: 50,
              sort: [{ '@timestamp': { order: 'desc' } }],
              _source: ['@timestamp', 'agent', 'user', 'message', 'host.name', 'source.ip'],
            },
          }),
        }
      );

      if (response && response.hits && response.hits.hits) {
        setDocuments(response.hits.hits);
      } else {
        setDocuments([]);
      }
    } catch (err) {
      setErrors(err instanceof Error ? err.message : 'Failed to fetch documents');
      setDocuments([]);
    } finally {
      setDocumentsLoading(false);
    }
  }, [selectedDataView, queryString, services.http, setErrors]);

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

  // Handle document selection
  const handleDocumentSelection = (selectedItems: Document[]) => {
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
          query: queryString,
          dataView: selectedDataView?.title,
          additionalData: {
            user: currentUser?.email || 'workflow-user@gmail.com',
            userName: currentUser?.username || 'workflow-user',
          },
        },
      };

      setValue(JSON.stringify(eventData, null, 2));
    } else {
      setValue('');
    }
  };

  // Convert data views to combobox options
  const dataViewOptions = useMemo(() => {
    return dataViews.map((dataView) => ({
      label: dataView.name || dataView.title,
      value: dataView.id,
    }));
  }, [dataViews]);

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
          const listItems: Array<{ title: string; description: string }> = [];
          ['kind', 'agent', 'user', 'message'].forEach((field: string) => {
            if (source[field] === undefined) {
              return;
            }
            listItems.push({
              title: field,
              description: source[field] || '-',
            });
          });
          return (
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiToken iconType="tokenString" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiDescriptionList type="inline" listItems={listItems} />
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      },
    ],
    []
  );

  // Table selection configuration
  const selection = {
    onSelectionChange: handleDocumentSelection,
    selectable: (item: Document) => true,
    selectableMessage: (selectable: boolean) => (!selectable ? 'Document not selectable' : ''),
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiSpacer size="s" />
      <EuiFlexGroup direction="row" gutterSize="l">
        {/* Data View Selector */}
        <EuiFlexItem
          grow={false}
          css={css`
            width: 200px;
          `}
        >
          <EuiFormRow label="Data View">
            <EuiComboBox
              placeholder="Select data view"
              aria-label="Data view"
              options={dataViewOptions}
              selectedOptions={
                selectedDataView
                  ? dataViewOptions.filter((opt) => opt.value === selectedDataView.id)
                  : []
              }
              onChange={(selectedOptions) => {
                if (selectedOptions.length > 0) {
                  handleDataViewChange(selectedOptions[0].value as string);
                }
              }}
              singleSelection={{ asPlainText: true }}
              isClearable={false}
              data-test-subj="workflow-data-view-selector"
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow label="Documents" fullWidth>
            <EuiFieldText
              placeholder="Filter your data using KQL syntax"
              value={queryString}
              onChange={(e) => setQueryString(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  fetchDocuments();
                }
              }}
              fullWidth
              prepend={<EuiIcon type="search" />}
              data-test-subj="workflow-query-input"
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      {/* Error Display */}
      {errors && (
        <EuiFlexItem>
          <EuiCallOut title="Error" color="danger" iconType="error" size="s">
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
            pagination={{
              pageSize: 10,
              pageSizeOptions: [5, 10, 25, 50],
            }}
            tableLayout="fixed"
            itemId="_id"
            data-test-subj="workflow-documents-table"
          />
        )}
      </EuiFlexItem>

      {/* Refresh Button */}
      <EuiFlexItem>
        <EuiButton
          iconType="refresh"
          onClick={fetchDocuments}
          isLoading={documentsLoading}
          disabled={!selectedDataView}
        >
          Refresh Documents
        </EuiButton>
      </EuiFlexItem>

      {/* Selection Summary */}
      {selectedDocuments.length > 0 && (
        <EuiFlexItem>
          <EuiCallOut title="Documents Selected" color="success" iconType="check" size="s">
            <EuiText size="s">
              {selectedDocuments.length} document(s) selected for workflow execution
            </EuiText>
          </EuiCallOut>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
