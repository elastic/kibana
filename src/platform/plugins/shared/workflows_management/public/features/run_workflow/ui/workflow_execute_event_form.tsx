/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { take } from 'rxjs';
import { AlertsSearchBar } from '@kbn/alerts-ui-shared';
import { SortDirection } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { Filter } from '@kbn/es-query';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { i18n } from '@kbn/i18n';
import type { AlertSelection, AlertTriggerInput } from '../../../../common/types/alert_types';
import { useKibana } from '../../../hooks/use_kibana';

/** Index pattern for alerts based on space ID */
const getAlertsIndexPattern = (spaceId: string) => `.alerts-*-${spaceId}`;

interface Alert {
  _id: string;
  _index: string;
  _source: {
    '@timestamp': string;
    'kibana.alert.rule.name': string;
    'kibana.alert.rule.uuid': string;
    'kibana.alert.severity': string;
    'kibana.alert.status': string;
    'kibana.alert.reason': string;
    [key: string]: unknown;
  };
}

interface WorkflowExecuteEventFormProps {
  value: string;
  setValue: (data: string) => void;
  errors: string | null;
  setErrors: (errors: string | null) => void;
}

export const WorkflowExecuteEventForm = ({
  value,
  setValue,
  errors,
  setErrors,
}: WorkflowExecuteEventFormProps): React.JSX.Element => {
  const { services } = useKibana();
  const { spaces, http, notifications, data: dataService, unifiedSearch } = services;
  const [spaceId, setSpaceId] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [timeRange, setTimeRange] = useState<{ from: string; to: string }>({
    from: 'now-15m',
    to: 'now',
  });

  const [alertsLoading, setAlertsLoading] = useState(false);
  const [query, setQuery] = useState<string>('');
  const [submittedQuery, setSubmittedQuery] = useState<string>('');
  const [filters, setFilters] = useState<Filter[]>([]);
  const [dataView, setDataView] = useState<DataView | null>(null);
  const dataViewCreatingRef = useRef(false);

  // Get space ID
  useEffect(() => {
    if (spaces) {
      spaces.getActiveSpace().then((space) => {
        setSpaceId(space.id);
      });
    }
  }, [spaces]);

  // Create and cache data view when space ID is available
  useEffect(() => {
    // Skip if already creating or if dependencies are not ready
    if (!dataService || !spaceId) {
      return;
    }

    // Check ref synchronously before async operation
    if (dataViewCreatingRef.current) {
      return;
    }

    // Set ref synchronously before starting async operation
    dataViewCreatingRef.current = true;

    const createDataView = async () => {
      try {
        const indexPattern = getAlertsIndexPattern(spaceId);
        const newDataView = await dataService.dataViews.create({
          title: indexPattern,
          timeFieldName: '@timestamp',
        });
        setDataView(newDataView);
      } catch (err) {
        setErrors(
          i18n.translate('workflows.workflowExecuteEventForm.dataViewError', {
            defaultMessage: 'Failed to create data view for alerts',
          })
        );
      } finally {
        dataViewCreatingRef.current = false;
      }
    };

    createDataView();
  }, [dataService, spaceId, setErrors]);

  const fetchAlerts = useCallback(async () => {
    if (!dataService || !spaceId || !dataView) {
      return;
    }

    setAlertsLoading(true);
    setErrors(null);

    try {
      // Use SearchSource to match Discovery's behavior - this handles fields API, date formats, etc.
      const searchSource = await dataService.search.searchSource.create();

      searchSource.setField('index', dataView);

      // Set query
      if (submittedQuery) {
        searchSource.setField('query', {
          query: submittedQuery,
          language: 'kuery',
        });
      }

      // Set time range filter with proper format (matching Discovery)
      const timeFilter: Filter = {
        query: {
          range: {
            '@timestamp': {
              gte: timeRange.from,
              lte: timeRange.to,
              format: 'strict_date_optional_time',
            },
          },
        },
        meta: {
          type: 'custom',
        },
      };

      // Set filters
      searchSource.setField('filter', [...filters, timeFilter]);

      // Set sort (matching Discovery's format)
      // Using type assertion because unmapped_type is a valid ES parameter
      // but not included in SearchSource's EsQuerySortValue type
      const sortWithUnmappedType = [
        {
          '@timestamp': {
            order: SortDirection.desc,
            format: 'strict_date_optional_time||epoch_millis',
            unmapped_type: 'boolean',
          },
        },
        {
          _doc: {
            order: SortDirection.desc,
            unmapped_type: 'boolean',
          },
        },
      ] as estypes.SortCombinations[];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      searchSource.setField('sort', sortWithUnmappedType as any);

      // Set size and track_total_hits (matching Discovery)
      searchSource.setField('size', 50);
      searchSource.setField('trackTotalHits', false);

      // Fetch using SearchSource (this will use fields API like Discovery)
      const response = await searchSource.fetch$().pipe(take(1)).toPromise();

      if (
        response &&
        response.rawResponse &&
        response.rawResponse.hits &&
        response.rawResponse.hits.hits
      ) {
        setAlerts(response.rawResponse.hits.hits as Alert[]);
      } else {
        setAlerts([]);
      }
    } catch (err) {
      setErrors(
        err instanceof Error
          ? err.message
          : i18n.translate('workflows.workflowExecuteEventForm.fetchError', {
              defaultMessage: 'Failed to fetch alerts',
            })
      );
      setAlerts([]);
    } finally {
      setAlertsLoading(false);
    }
  }, [
    dataService,
    setErrors,
    submittedQuery,
    timeRange.from,
    timeRange.to,
    spaceId,
    filters,
    dataView,
  ]);

  useEffect(() => {
    if (dataView) {
      fetchAlerts();
    }
    // Only trigger fetch when dataView is ready and query/time/filters change
  }, [dataView, submittedQuery, timeRange.from, timeRange.to, filters, fetchAlerts]);

  const updateEventData = (selectedAlerts: Alert[]) => {
    if (selectedAlerts.length > 0) {
      const alertIds: AlertSelection[] = selectedAlerts.map((alert: Alert) => ({
        _id: alert._id,
        _index: alert._index,
      }));

      const workflowEvent: AlertTriggerInput = {
        event: {
          alertIds,
          triggerType: 'alert',
        },
      };

      setValue(JSON.stringify(workflowEvent, null, 2));
    }
  };

  const handleQueryChange = useCallback(
    ({
      query: newQuery,
      dateRange,
    }: {
      query?: string;
      dateRange: { from: string; to: string };
    }) => {
      if (newQuery !== undefined) {
        setQuery(newQuery);
      }
      setTimeRange(dateRange);
    },
    []
  );

  const handleQuerySubmit = useCallback(
    ({
      query: newQuery,
      dateRange,
    }: {
      query?: string;
      dateRange: { from: string; to: string };
    }) => {
      // Update both draft and submitted query on submit
      if (newQuery !== undefined) {
        setQuery(newQuery);
        setSubmittedQuery(newQuery);
      }
      setTimeRange(dateRange);
      // fetchAlerts will be triggered by useEffect when submittedQuery changes
    },
    []
  );

  const handleFiltersUpdated = useCallback((newFilters: Filter[]) => {
    setFilters(newFilters);
  }, []);

  const fmt = services.fieldFormats.getDefaultInstance(KBN_FIELD_TYPES.DATE);

  const columns: EuiBasicTableColumn<Alert>[] = [
    {
      field: '_source.@timestamp',
      name: '@timestamp',
      sortable: true,
      width: '250px',
      render: (timestamp: string) => fmt.convert(new Date(timestamp)),
    },
    {
      field: '_source.kibana.alert.rule.name',
      name: i18n.translate('workflows.workflowExecuteEventForm.ruleColumnHeader', {
        defaultMessage: 'Rule',
      }),
      sortable: true,
      render: (name: string, item: Alert) => item._source['kibana.alert.rule.name'],
    },
    {
      field: '_source.message',
      name: i18n.translate('workflows.workflowExecuteEventForm.messageColumnHeader', {
        defaultMessage: 'Message',
      }),
      sortable: true,
      render: (message: string, item: Alert) => {
        const originalMessage = item._source.message;
        if (originalMessage) {
          return typeof originalMessage === 'string' ? originalMessage : String(originalMessage);
        }
        return item._source['kibana.alert.reason'] || '-';
      },
    },
  ];

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiSpacer size="s" />
      <EuiFlexItem>
        <AlertsSearchBar
          appName="workflow_management"
          showDatePicker
          onQueryChange={handleQueryChange}
          onQuerySubmit={handleQuerySubmit}
          onFiltersUpdated={handleFiltersUpdated}
          query={query}
          filters={filters}
          rangeFrom={timeRange.from}
          rangeTo={timeRange.to}
          showFilterBar={false}
          showSubmitButton={true}
          placeholder={i18n.translate('workflows.workflowExecuteEventForm.searchPlaceholder', {
            defaultMessage:
              'Filter your data using KQL syntax (e.g., rule.name:test or kibana.alert.rule.name:test)',
          })}
          ruleTypeIds={[]}
          http={http}
          toasts={notifications.toasts}
          unifiedSearchBar={unifiedSearch.ui.SearchBar}
          dataService={dataService}
          fetchUnifiedAlertsFields={true}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        {alertsLoading ? (
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="m" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s">
                {i18n.translate('workflows.workflowExecuteEventForm.loadingAlerts', {
                  defaultMessage: 'Loading alerts...',
                })}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <EuiBasicTable
            itemId="_id"
            rowHeader="@timestamp"
            tableLayout="fixed"
            items={alerts}
            columns={columns}
            tableCaption={i18n.translate('workflows.workflowExecuteEventForm.tableCaption', {
              defaultMessage: 'Alerts list for workflow execution',
            })}
            selection={{
              onSelectionChange: updateEventData,
            }}
          />
        )}
      </EuiFlexItem>

      {/* Error Display */}
      {errors && (
        <EuiFlexItem>
          <EuiCallOut
            announceOnMount
            title={i18n.translate('workflows.workflowExecuteEventForm.errorTitle', {
              defaultMessage: 'Failed to load alerts',
            })}
            color="warning"
            iconType="help"
            size="s"
          >
            <p>{errors}</p>
            <EuiText size="s">
              {i18n.translate('workflows.workflowExecuteEventForm.errorMessage', {
                defaultMessage:
                  'Make sure you have the proper permissions to access security alerts, or manually enter the event data below.',
              })}
            </EuiText>
          </EuiCallOut>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
