/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
import React, { useCallback, useEffect, useState } from 'react';
import { take } from 'rxjs';
import type { Query, TimeRange } from '@kbn/data-plugin/common';
import { buildEsQuery } from '@kbn/es-query';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { i18n } from '@kbn/i18n';
import type { AlertSelection, AlertTriggerInput } from '../../../../common/types/alert_types';
import { useKibana } from '../../../hooks/use_kibana';

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
  const {
    unifiedSearch: {
      ui: { SearchBar },
    },
    spaces,
  } = services;
  const [spaceId, setSpaceId] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>({
    from: 'now-15m',
    to: 'now',
  });

  const [alertsLoading, setAlertsLoading] = useState(false);
  const [query, setQuery] = useState<Query>({ query: '', language: 'kuery' });

  // Get space ID
  useEffect(() => {
    if (spaces) {
      spaces.getActiveSpace().then((space) => {
        setSpaceId(space.id);
      });
    }
  }, [spaces]);

  const fetchAlerts = useCallback(async () => {
    if (!services.data || !spaceId) {
      return;
    }

    setAlertsLoading(true);
    setErrors(null);

    try {
      const esQuery = buildEsQuery(undefined, query ? [query] : [], []);
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

      const request = {
        params: {
          index: `.alerts-*-${spaceId}`,
          body: {
            query: searchQuery,
            size: 50,
            sort: [{ '@timestamp': { order: 'desc' } }],
          },
        },
      };

      const response = await services.data.search.search(request).pipe(take(1)).toPromise();

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
      setErrors(err instanceof Error ? err.message : 'Failed to fetch alerts');
      setAlerts([]);
    } finally {
      setAlertsLoading(false);
    }
  }, [services.data, setErrors, query, timeRange.from, timeRange.to, spaceId]);

  useEffect(() => {
    if (spaceId) {
      fetchAlerts();
    }
  }, [fetchAlerts, spaceId]);

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
      name: 'Rule',
      sortable: true,
      render: (name: string, item: Alert) => item._source['kibana.alert.rule.name'],
    },
  ];

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiSpacer size="s" />
      <EuiFlexItem>
        <SearchBar
          appName="workflow_management"
          showDatePicker
          onQuerySubmit={handleQueryChange}
          query={query}
          dateRangeFrom={timeRange.from}
          dateRangeTo={timeRange.to}
          showFilterBar={false}
          showSubmitButton={true}
          placeholder="Filter your data using KQL syntax"
          data-test-subj="workflow-query-input"
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
            title="Failed to load alerts"
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
