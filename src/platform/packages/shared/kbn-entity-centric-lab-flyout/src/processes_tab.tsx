/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButtonIcon,
  EuiCode,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFieldSearch,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

type ProcessState = 'running' | 'sleeping' | 'stopped' | 'idle' | 'dead' | 'zombie' | 'unknown';

interface FakeProcess {
  readonly id: string;
  readonly command: string;
  readonly pid: number;
  readonly user: string;
  readonly state: ProcessState;
  readonly cpu: number;
  readonly memory: number;
  readonly startTime: number;
}

interface ProcessesTabProps {
  readonly entityName: string;
}

const STATE_LABELS: Record<ProcessState, string> = {
  running: 'Running',
  sleeping: 'Sleeping',
  stopped: 'Stopped',
  idle: 'Idle',
  dead: 'Dead',
  zombie: 'Zombie',
  unknown: 'Unknown',
};

const STATE_BADGE_COLOR: Record<ProcessState, string> = {
  running: 'success',
  sleeping: 'default',
  stopped: 'warning',
  idle: 'default',
  dead: 'danger',
  zombie: 'danger',
  unknown: 'hollow',
};

const STATE_ORDER: readonly ProcessState[] = [
  'running',
  'sleeping',
  'stopped',
  'idle',
  'dead',
  'zombie',
  'unknown',
];

const PROCESS_POOL: ReadonlyArray<Omit<FakeProcess, 'startTime' | 'id'>> = [
  { command: '/usr/bin/metricbeat -c /etc/metricbeat.yml -d autodiscover -e', pid: 1842, user: 'root', state: 'running', cpu: 2.4, memory: 1.8 },
  { command: '/usr/sbin/sshd -D', pid: 982, user: 'root', state: 'sleeping', cpu: 0.0, memory: 0.3 },
  { command: '/usr/lib/systemd/systemd-journald', pid: 312, user: 'root', state: 'running', cpu: 0.8, memory: 2.1 },
  { command: 'node /opt/app/server.js --port 3000 --env production', pid: 4521, user: 'app', state: 'running', cpu: 12.3, memory: 8.7 },
  { command: '/usr/sbin/nginx -g daemon off;', pid: 1203, user: 'www-data', state: 'sleeping', cpu: 0.1, memory: 0.5 },
  { command: 'java -Xmx4g -jar /opt/elasticsearch/elasticsearch.jar', pid: 2891, user: 'elastic', state: 'running', cpu: 18.7, memory: 24.3 },
  { command: '/usr/bin/dockerd --containerd /run/containerd/containerd.sock', pid: 1456, user: 'root', state: 'running', cpu: 3.2, memory: 4.1 },
  { command: 'postgres: writer process', pid: 3421, user: 'postgres', state: 'idle', cpu: 0.0, memory: 1.2 },
  { command: '/usr/bin/containerd', pid: 1123, user: 'root', state: 'running', cpu: 1.1, memory: 2.8 },
  { command: '/usr/bin/python3 /opt/collector/main.py --config /etc/collector.yml', pid: 5678, user: 'otel', state: 'running', cpu: 5.6, memory: 3.4 },
  { command: '/usr/sbin/rsyslogd -n -iNONE', pid: 654, user: 'syslog', state: 'sleeping', cpu: 0.0, memory: 0.2 },
  { command: 'redis-server *:6379', pid: 7890, user: 'redis', state: 'running', cpu: 1.9, memory: 5.2 },
  { command: '/usr/sbin/chronyd -F 1', pid: 421, user: 'chrony', state: 'sleeping', cpu: 0.0, memory: 0.1 },
  { command: '/usr/bin/filebeat -c /etc/filebeat.yml -e --strict.perms=false', pid: 2234, user: 'root', state: 'running', cpu: 1.4, memory: 1.5 },
  { command: '/usr/lib/systemd/systemd-resolved', pid: 498, user: 'systemd-resolve', state: 'sleeping', cpu: 0.0, memory: 0.4 },
];

const generateProcesses = (hostName: string): readonly FakeProcess[] => {
  const seed = hostName.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const now = Date.now();

  const count = 8 + (seed % 5);
  const result: FakeProcess[] = [];
  for (let idx = 0; idx < count; idx++) {
    const base = PROCESS_POOL[(seed + idx) % PROCESS_POOL.length];
    const runtimeMs = ((seed * (idx + 1) * 7919) % 86400000) + 60000;
    const pid = base.pid + ((seed * idx) % 100);
    result.push({
      ...base,
      id: `${pid}-${idx}`,
      pid,
      cpu: Math.round((base.cpu + ((seed * idx) % 30) * 0.1) * 100) / 100,
      memory: Math.round((base.memory + ((seed * idx) % 20) * 0.1) * 100) / 100,
      startTime: now - runtimeMs,
    });
  }
  return result.sort(
    (a, b) => STATE_ORDER.indexOf(a.state) - STATE_ORDER.indexOf(b.state)
  );
};

const formatRuntime = (startTime: number, now: number): string => {
  let remaining = now - startTime;
  const hours = Math.floor(remaining / 3600000);
  remaining -= hours * 3600000;
  const minutes = Math.floor(remaining / 60000);
  remaining -= minutes * 60000;
  const seconds = Math.floor(remaining / 1000);

  const hh = hours > 0 ? `${hours}:` : '';
  const mm = minutes < 10 ? `0${minutes}:` : `${minutes}:`;
  const ss = seconds < 10 ? `0${seconds}` : `${seconds}`;
  return `${hh}${mm}${ss}`;
};

const ProcessSummary = ({
  processes,
}: {
  readonly processes: readonly FakeProcess[];
}) => {
  const counts = useMemo(() => {
    const map: Record<string, number> = { total: processes.length };
    for (const state of STATE_ORDER) {
      map[state] = processes.filter((p) => p.state === state).length;
    }
    return map;
  }, [processes]);

  const items = useMemo(
    () =>
      [
        { label: 'Total processes', value: counts.total },
        ...STATE_ORDER.map((s) => ({ label: STATE_LABELS[s], value: counts[s] })),
      ].filter((item) => item.value > 0 || item.label === 'Total processes'),
    [counts]
  );

  return (
    <>
      <EuiFlexGroup gutterSize="m" responsive={false} wrap>
        {items.map((item) => (
          <EuiFlexItem key={item.label}>
            <EuiDescriptionList compressed>
              <EuiDescriptionListTitle
                css={css`white-space: nowrap;`}
              >
                {item.label}
              </EuiDescriptionListTitle>
              <EuiDescriptionListDescription>
                {item.value}
              </EuiDescriptionListDescription>
            </EuiDescriptionList>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      <EuiHorizontalRule margin="m" />
    </>
  );
};

export const ProcessesTab = ({ entityName }: ProcessesTabProps) => {
  const { euiTheme } = useEuiTheme();
  const allProcesses = useMemo(() => generateProcesses(entityName), [entityName]);
  const now = useMemo(() => Date.now(), []);
  const [searchText, setSearchText] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchText(e.target.value);
    },
    []
  );

  const filteredProcesses = useMemo(() => {
    if (!searchText.trim()) return allProcesses;
    const lower = searchText.toLowerCase();
    return allProcesses.filter(
      (p) =>
        p.command.toLowerCase().includes(lower) ||
        p.user.toLowerCase().includes(lower) ||
        String(p.pid).includes(lower)
    );
  }, [allProcesses, searchText]);

  const toggleExpand = useCallback((item: FakeProcess) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.add(item.id);
      }
      return next;
    });
  }, []);

  const columns = useMemo<Array<EuiBasicTableColumn<FakeProcess>>>(
    () => [
      {
        width: '40px',
        isExpander: true,
        name: '',
        render: (item: FakeProcess) => (
          <EuiButtonIcon
            iconType={expandedIds.has(item.id) ? 'arrowDown' : 'arrowRight'}
            onClick={() => toggleExpand(item)}
            aria-label={expandedIds.has(item.id) ? 'Collapse' : 'Expand'}
            color="text"
          />
        ),
      },
      {
        field: 'state',
        name: i18n.translate('entityCentricLabFlyout.flyout.processes.colState', {
          defaultMessage: 'State',
        }),
        width: '84px',
        render: (state: ProcessState) => (
          <EuiBadge color={STATE_BADGE_COLOR[state]}>
            {STATE_LABELS[state]}
          </EuiBadge>
        ),
      },
      {
        field: 'command',
        name: i18n.translate('entityCentricLabFlyout.flyout.processes.colCommand', {
          defaultMessage: 'Command',
        }),
        width: '40%',
        truncateText: true,
        render: (command: string) => (
          <EuiText size="s">
            <code>{command}</code>
          </EuiText>
        ),
      },
      {
        field: 'startTime',
        name: i18n.translate('entityCentricLabFlyout.flyout.processes.colTime', {
          defaultMessage: 'Time',
        }),
        align: 'right' as const,
        render: (startTime: number) => (
          <EuiText size="s">{formatRuntime(startTime, now)}</EuiText>
        ),
      },
      {
        field: 'cpu',
        name: i18n.translate('entityCentricLabFlyout.flyout.processes.colCpu', {
          defaultMessage: 'CPU',
        }),
        align: 'right' as const,
        render: (cpu: number) => (
          <EuiText size="s">{`${cpu.toFixed(1)}%`}</EuiText>
        ),
      },
      {
        field: 'memory',
        name: i18n.translate('entityCentricLabFlyout.flyout.processes.colMemory', {
          defaultMessage: 'Mem.',
        }),
        align: 'right' as const,
        render: (mem: number) => (
          <EuiText size="s">{`${mem.toFixed(1)}%`}</EuiText>
        ),
      },
    ],
    [now, expandedIds, toggleExpand]
  );

  const expandedRowMap = useMemo(() => {
    const map: Record<string, React.ReactNode> = {};
    for (const id of expandedIds) {
      const proc = filteredProcesses.find((p) => p.id === id);
      if (!proc) continue;
      map[id] = (
        <div
          css={css`
            padding: ${euiTheme.size.m};
          `}
        >
          <EuiDescriptionList compressed>
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem>
                <EuiDescriptionListTitle>
                  {i18n.translate('entityCentricLabFlyout.flyout.processes.expandedCommand', {
                    defaultMessage: 'Command',
                  })}
                </EuiDescriptionListTitle>
                <EuiDescriptionListDescription>
                  <EuiCode transparentBackground>{proc.command}</EuiCode>
                </EuiDescriptionListDescription>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            <EuiFlexGrid columns={2} gutterSize="s" responsive={false}>
              <EuiFlexItem>
                <EuiDescriptionListTitle>
                  {i18n.translate('entityCentricLabFlyout.flyout.processes.expandedPid', {
                    defaultMessage: 'PID',
                  })}
                </EuiDescriptionListTitle>
                <EuiDescriptionListDescription>
                  <EuiCode transparentBackground>{proc.pid}</EuiCode>
                </EuiDescriptionListDescription>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiDescriptionListTitle>
                  {i18n.translate('entityCentricLabFlyout.flyout.processes.expandedUser', {
                    defaultMessage: 'User',
                  })}
                </EuiDescriptionListTitle>
                <EuiDescriptionListDescription>
                  <EuiCode transparentBackground>{proc.user}</EuiCode>
                </EuiDescriptionListDescription>
              </EuiFlexItem>
            </EuiFlexGrid>
          </EuiDescriptionList>
        </div>
      );
    }
    return map;
  }, [expandedIds, filteredProcesses, euiTheme.size.m]);

  return (
    <>
      <ProcessSummary processes={allProcesses} />
      <EuiFlexGroup gutterSize="xs" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <span>
              {i18n.translate('entityCentricLabFlyout.flyout.processes.topTitle', {
                defaultMessage: 'Top {count} processes',
                values: { count: allProcesses.length },
              })}
            </span>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={i18n.translate('entityCentricLabFlyout.flyout.processes.topTooltip', {
              defaultMessage:
                'The top processes are sorted by CPU usage and show the most resource-intensive processes currently running on this host.',
            })}
          >
            <EuiIcon type="questionInCircle" color="subdued" />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiFieldSearch
        fullWidth
        placeholder={i18n.translate('entityCentricLabFlyout.flyout.processes.searchPlaceholder', {
          defaultMessage: 'Search for processes…',
        })}
        value={searchText}
        isClearable
        onChange={handleSearchChange}
      />
      <EuiSpacer size="m" />
      <EuiBasicTable
        items={filteredProcesses as FakeProcess[]}
        itemId="id"
        columns={columns}
        isExpandable
        itemIdToExpandedRowMap={expandedRowMap}
        tableLayout="auto"
      />
      {filteredProcesses.length === 0 && (
        <>
          <EuiSpacer size="m" />
          <EuiText size="s" color="subdued" textAlign="center">
            {i18n.translate('entityCentricLabFlyout.flyout.processes.noResults', {
              defaultMessage: 'No processes found',
            })}
          </EuiText>
        </>
      )}
    </>
  );
};
