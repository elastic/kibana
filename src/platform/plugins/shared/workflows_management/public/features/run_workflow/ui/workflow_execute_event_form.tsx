/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiBasicTableColumn, OnTimeChangeProps } from '@elastic/eui';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSearchBar,
  EuiSpacer,
  EuiText,
  EuiBasicTable,
  EuiSuperDatePicker,
} from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { AuthenticatedUser } from '@kbn/security-plugin-types-common';
import React, { useEffect, useState, useCallback } from 'react';
import type { SecurityServiceStart } from '@kbn/core-security-browser';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { WorkflowsPluginStartDependencies } from '../../../types';

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
    [key: string]: any;
  };
}

interface AlertsResponse {
  hits: {
    hits: Alert[];
    total: { value: number; relation: string };
  };
}

interface WorkflowExecuteEventFormProps {
  value: string;
  setValue: (data: string) => void;
  errors: string | null;
  setErrors: (errors: string | null) => void;
}

const getDefaultWorkflowInput = (currentUser: any): string => {
  const userEmail = currentUser?.email || 'workflow-user@gmail.com';
  const userName = currentUser?.username || 'workflow-user';
  return JSON.stringify(
    {
      event: {
        ruleName: 'Detect vulnerabilities',
        additionalData: {
          user: userEmail,
          userName,
        },
      },
    },
    null,
    2
  );
};

const getCurrentUser = async (security: SecurityServiceStart) => {
  try {
    if (security) {
      return await security.authc.getCurrentUser();
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
  }
  return null;
};

function TimeRangePicker({
  onChange,
  start,
  end,
}: {
  onChange?: (start: string, end: string) => void;
  start: string;
  end: string;
}) {
  // Use Elastic date math strings (works great with ES queries)
  // const [start, setStart] = useState<string>('now-15m');
  // const [end, setEnd] = useState<string>('now');
  const [recentlyUsedRanges, setRecentlyUsedRanges] = useState<{ start: string; end: string }[]>(
    []
  );

  const commonlyUsedRanges = [
    { start: 'now-15m', end: 'now', label: 'Last 15 minutes' },
    { start: 'now-30m', end: 'now', label: 'Last 30 minutes' },
    { start: 'now-1h', end: 'now', label: 'Last 1 hour' },
    { start: 'now-24h', end: 'now', label: 'Last 24 hours' },
    { start: 'now-7d', end: 'now', label: 'Last 7 days' },
    { start: 'now/d', end: 'now/d', label: 'Today' },
  ];

  const onTimeChange = ({ start: s, end: e }: OnTimeChangeProps) => {
    setRecentlyUsedRanges((prev) => [
      { start: s, end: e },
      ...prev.filter((r) => !(r.start === s && r.end === e)).slice(0, 9),
    ]);
    onChange?.(s, e);
  };

  return (
    <EuiSuperDatePicker
      start={start}
      end={end}
      onTimeChange={onTimeChange}
      isAutoRefreshOnly={false}
      commonlyUsedRanges={commonlyUsedRanges}
      recentlyUsedRanges={recentlyUsedRanges}
      // auto refresh (optional)
      onRefresh={() => onChange?.(start, end)}
      refreshInterval={60000}
      isPaused={true}
    />
  );
}

export const WorkflowExecuteEventForm = ({
  value,
  setValue,
  errors,
  setErrors,
}: WorkflowExecuteEventFormProps): React.JSX.Element => {
  const { services } = useKibana<CoreStart & WorkflowsPluginStartDependencies>();
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [timeRange, setTimeRage] = useState<{ start: string; end: string }>({
    start: 'now-15m',
    end: 'now',
  });
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [query, setQuery] = useState('');

  const fetchAlerts = useCallback(async () => {
    if (!services.http) {
      setErrors('HTTP service not available');
      return;
    }

    setAlertsLoading(true);
    setErrors(null);

    try {
      // Query for recent alerts (last 24 hours)
      const esQuery: {
        bool: {
          filter: object[];
          must: object[];
        };
      } = {
        bool: {
          filter: [
            {
              range: {
                '@timestamp': {
                  gte: timeRange.start,
                  lte: timeRange.end,
                },
              },
            },
          ],
          must: [],
        },
      };

      if (query) {
        esQuery.bool.must.push({
          simple_query_string: {
            query,
            fields: ['kibana.alert.rule.name'],
            default_operator: 'and',
          },
        });
      }

      const response = await services.http.post<AlertsResponse>(
        '/api/detection_engine/signals/search',
        {
          body: JSON.stringify({
            query: esQuery,
            size: 50, // Limit to 50 recent alerts
            sort: [{ '@timestamp': { order: 'desc' } }],
            _source: [
              '@timestamp',
              'kibana.alert.rule.name',
              'kibana.alert.rule.uuid',
              'kibana.alert.severity',
              'kibana.alert.status',
              'kibana.alert.reason',
              'agent.name',
              'host.name',
              'user.name',
              'process.name',
              'file.name',
              'source.ip',
              'destination.ip',
            ],
          }),
          headers: {
            'Content-Type': 'application/json',
          },
          version: '2023-10-31',
        }
      );

      if (response && response.hits && response.hits.hits) {
        setAlerts(response.hits.hits);
      } else {
        setAlerts([]);
      }
    } catch (err) {
      setErrors(err instanceof Error ? err.message : 'Failed to fetch alerts');
      setAlerts([]);
    } finally {
      setAlertsLoading(false);
    }
  }, [services.http, setErrors, query, timeRange]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

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

  const updateEventData = (selectedAlerts: Alert[]) => {
    if (selectedAlerts.length > 0) {
      const alertEvents = selectedAlerts.map((alert: Alert) => ({
        id: alert._id,
        index: alert._index,
        timestamp: alert._source['@timestamp'],
        rule: {
          name: alert._source['kibana.alert.rule.name'],
          uuid: alert._source['kibana.alert.rule.uuid'],
        },
        severity: alert._source['kibana.alert.severity'],
        status: alert._source['kibana.alert.status'],
        reason: alert._source['kibana.alert.reason'],
        ...(alert._source['agent.name'] && { agent: { name: alert._source['agent.name'] } }),
        ...(alert._source['host.name'] && { host: { name: alert._source['host.name'] } }),
        ...(alert._source['user.name'] && { user: { name: alert._source['user.name'] } }),
        ...(alert._source['process.name'] && {
          process: { name: alert._source['process.name'] },
        }),
        ...(alert._source['file.name'] && { file: { name: alert._source['file.name'] } }),
        ...(alert._source['source.ip'] && { source: { ip: alert._source['source.ip'] } }),
        ...(alert._source['destination.ip'] && {
          destination: { ip: alert._source['destination.ip'] },
        }),
      }));

      const workflowEvent = {
        event: {
          alerts: alertEvents,
          additionalData: {
            user: currentUser?.email || 'workflow-user@gmail.com',
            userName: currentUser?.username || 'workflow-user',
          },
        },
      };

      setValue(JSON.stringify(workflowEvent, null, 2));
    } else {
      setValue(getDefaultWorkflowInput(currentUser));
    }
  };

  useEffect(() => {
    if (!value && currentUser) {
      setValue(getDefaultWorkflowInput(currentUser));
    }
  }, [value, currentUser, setValue]);

  const handleTimeRangeChange = (start: string, end: string) => {
    setTimeRage({ start, end });
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
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiSpacer size="s" />
      <EuiFlexItem>
        <EuiFlexGroup direction="row" gutterSize="s">
          <EuiFlexItem>
            <EuiSearchBar
              box={{
                placeholder: 'Filter your data using KQL syntax',
                incremental: true,
                fullWidth: true,
              }}
              onChange={({ query: newQuery }) => setQuery(newQuery?.text || '')}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <TimeRangePicker
              onChange={handleTimeRangeChange}
              start={timeRange.start}
              end={timeRange.end}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        {alertsLoading ? (
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="m" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s">Loading alerts...</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <EuiBasicTable
            itemId="_id"
            rowHeader="@timestamp"
            tableLayout="fixed"
            items={alerts}
            columns={columns}
            onChange={() => {}}
            selection={{
              onSelectionChange: updateEventData,
            }}
          />
        )}
      </EuiFlexItem>

      {/* Error Display */}
      {errors && (
        <EuiFlexItem>
          <EuiCallOut title="Failed to load alerts" color="warning" iconType="help" size="s">
            <p>{errors}</p>
            <EuiText size="s">
              Make sure you have the proper permissions to access security alerts, or manually enter
              the event data below.
            </EuiText>
          </EuiCallOut>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
