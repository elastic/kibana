/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useState } from 'react';
import {
  EuiAccordion,
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHealth,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiSwitch,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { Axis, Chart, CurveType, LineSeries, Position, ScaleType, Settings } from '@elastic/charts';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import type { EntitySimulationModel, RelatedEntityHealth } from './mock_entity_simulation_data';

export interface EntitySimulationFlyoutProps {
  entity: EntitySimulationModel;
  onClose: () => void;
}

const TAB_OVERVIEW = 'overview';
const TAB_METRICS = 'metrics';
const TAB_LOGS = 'logs';
const TAB_ALERTS = 'alerts';
const TAB_RELATIONSHIPS = 'relationships';

const chartWrapCss = css`
  width: 100%;
  height: 180px;
`;

const miniGraphCss = css`
  width: 100%;
  height: 120px;
`;

function MetricLineChart({
  data,
  color,
  name,
}: {
  data: Array<{ x: number; y: number }>;
  color: string;
  name: string;
}) {
  const { charts } = useDiscoverServices();
  const baseTheme = charts.theme.useChartsBaseTheme();
  const chartData = useMemo(() => data.map((d) => ({ t: d.x, v: d.y })), [data]);

  return (
    <div css={chartWrapCss}>
      <Chart>
        <Settings baseTheme={baseTheme} showLegend={false} locale={i18n.getLocale()} />
        <Axis
          id="bottom"
          position={Position.Bottom}
          tickFormat={(d) => new Date(d as number).toLocaleTimeString([], { hour: '2-digit' })}
        />
        <Axis id="left" position={Position.Left} />
        <LineSeries
          id={name}
          name={name}
          data={chartData}
          xAccessor="t"
          yAccessors={['v']}
          xScaleType={ScaleType.Time}
          curve={CurveType.CURVE_MONOTONE_X}
          color={color}
          lineSeriesStyle={{ point: { visible: 'never' } }}
        />
      </Chart>
    </div>
  );
}

function RelationshipsDiagram({ entity }: { entity: EntitySimulationModel }) {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiPanel paddingSize="m" hasBorder>
      <EuiText size="s" color="subdued">
        <p>
          {i18n.translate('discover.entitySimulation.relationshipsDiagramHint', {
            defaultMessage:
              'Neighbourhood view (simulated). Lines show inferred dependencies from traces and infrastructure signals.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s" wrap>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">checkout-api</EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIcon type="sortRight" color="primary" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="danger">{entity.name}</EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIcon type="sortRight" color="primary" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">gke-us-east-1-01</EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <div
        css={css`
          border-top: ${euiTheme.border.thin};
          padding-top: ${euiTheme.size.s};
        `}
      />
      <EuiText size="xs" color="subdued" textAlign="center">
        {i18n.translate('discover.entitySimulation.relationshipsPodHint', {
          defaultMessage: 'Pods and downstream services connect here in a full implementation.',
        })}
      </EuiText>
    </EuiPanel>
  );
}

export function EntitySimulationFlyout({ entity, onClose }: EntitySimulationFlyoutProps) {
  const { euiTheme } = useEuiTheme();
  const [selectedTab, setSelectedTab] = useState(TAB_OVERVIEW);
  const [surfaceEvents, setSurfaceEvents] = useState(true);

  const tabs = [
    {
      id: TAB_OVERVIEW,
      name: i18n.translate('discover.entitySimulation.tabOverview', { defaultMessage: 'Overview' }),
    },
    {
      id: TAB_METRICS,
      name: i18n.translate('discover.entitySimulation.tabMetrics', { defaultMessage: 'Metrics' }),
    },
    {
      id: TAB_LOGS,
      name: i18n.translate('discover.entitySimulation.tabLogs', { defaultMessage: 'Logs' }),
    },
    {
      id: TAB_ALERTS,
      name: i18n.translate('discover.entitySimulation.tabAlerts', { defaultMessage: 'Alerts' }),
    },
    {
      id: TAB_RELATIONSHIPS,
      name: i18n.translate('discover.entitySimulation.tabRelationships', {
        defaultMessage: 'Relationships',
      }),
    },
  ];

  const relatedColumns = [
    {
      field: 'health',
      name: i18n.translate('discover.entitySimulation.colHealth', { defaultMessage: 'Health' }),
      render: (health: RelatedEntityHealth) => (
        <EuiHealth
          color={health === 'healthy' ? 'success' : health === 'unhealthy' ? 'danger' : 'inactive'}
        >
          {health}
        </EuiHealth>
      ),
    },
    {
      field: 'name',
      name: i18n.translate('discover.entitySimulation.colEntityName', {
        defaultMessage: 'Entity name',
      }),
    },
    {
      field: 'entityType',
      name: i18n.translate('discover.entitySimulation.colEntityType', {
        defaultMessage: 'Entity type',
      }),
    },
    {
      field: 'relationship',
      name: i18n.translate('discover.entitySimulation.colRelationship', {
        defaultMessage: 'Relationship',
      }),
    },
  ];

  const logColumns = [
    {
      field: 'timestamp',
      name: '@timestamp',
      width: '220px',
    },
    {
      field: 'summary',
      name: i18n.translate('discover.entitySimulation.colSummary', { defaultMessage: 'Summary' }),
    },
  ];

  const alertColumns = [
    {
      field: 'status',
      name: i18n.translate('discover.entitySimulation.colStatus', { defaultMessage: 'Status' }),
      width: '100px',
    },
    {
      field: 'triggered',
      name: i18n.translate('discover.entitySimulation.colTriggered', {
        defaultMessage: 'Triggered',
      }),
      width: '200px',
    },
    {
      field: 'ruleName',
      name: i18n.translate('discover.entitySimulation.colRuleName', {
        defaultMessage: 'Rule name',
      }),
    },
    {
      field: 'reason',
      name: i18n.translate('discover.entitySimulation.colReason', { defaultMessage: 'Reason' }),
    },
  ];

  type GoldenMetricAccent = EntitySimulationModel['goldenMetrics'][number]['accent'];

  const goldenAccent = (accent: GoldenMetricAccent) =>
    accent === 'success'
      ? euiTheme.colors.successText
      : accent === 'warning'
      ? euiTheme.colors.warningText
      : euiTheme.colors.dangerText;

  return (
    <EuiFlyout
      ownFocus
      onClose={onClose}
      size="m"
      aria-labelledby="entitySimulationFlyoutTitle"
      data-test-subj="entitySimulationFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="flexStart" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h2 id="entitySimulationFlyoutTitle">
                {entity.name} <EuiIcon type="iInCircle" color="subdued" title="Entity" />
              </h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          <FormattedMessage
            id="discover.entitySimulation.lastUpdate"
            defaultMessage="Last update: {date}"
            values={{ date: entity.lastUpdateLabel }}
          />
        </EuiText>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="xs" wrap>
          {entity.tags.map((t) => (
            <EuiBadge key={t.label} color={t.color}>
              {t.label}
            </EuiBadge>
          ))}
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <EuiTabs expand={false}>
          {tabs.map((tab) => (
            <EuiTab
              key={tab.id}
              isSelected={selectedTab === tab.id}
              onClick={() => setSelectedTab(tab.id)}
            >
              {tab.name}
            </EuiTab>
          ))}
        </EuiTabs>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {selectedTab === TAB_OVERVIEW && (
          <>
            <EuiPanel
              paddingSize="m"
              hasBorder
              css={css`
                border-left: ${euiTheme.border.width.thick} solid ${euiTheme.colors.primary};
              `}
            >
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiIcon type="sparkles" color="primary" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiTitle size="xxs">
                    <h3>
                      {i18n.translate('discover.entitySimulation.entitySummary', {
                        defaultMessage: 'Entity summary',
                      })}
                    </h3>
                  </EuiTitle>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="s" />
              <EuiText size="s">{entity.summary}</EuiText>
              <EuiSpacer size="xs" />
              <EuiText size="xs" color="subdued">
                {entity.summaryDate}
              </EuiText>
            </EuiPanel>
            <EuiSpacer size="l" />
            <EuiTitle size="xxs">
              <h3>
                {i18n.translate('discover.entitySimulation.goldenSignals', {
                  defaultMessage: 'Golden signals',
                })}
              </h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiFlexGroup gutterSize="m">
              {entity.goldenMetrics.map((m) => (
                <EuiFlexItem key={m.title}>
                  <EuiPanel paddingSize="m" hasBorder>
                    <EuiText size="xs" color="subdued">
                      {m.title}
                    </EuiText>
                    <EuiText size="l">
                      <strong css={{ color: goldenAccent(m.accent) }}>{m.value}</strong>
                    </EuiText>
                    <EuiText size="xs" color="subdued">
                      {m.delta}
                    </EuiText>
                    <EuiSpacer size="s" />
                    <div css={miniGraphCss}>
                      <MetricLineChart
                        data={
                          m.title.toLowerCase().includes('latency')
                            ? entity.latencySeries
                            : m.title.toLowerCase().includes('error')
                            ? entity.errorRateSeries
                            : entity.throughputSeries
                        }
                        color={goldenAccent(m.accent)}
                        name={m.title}
                      />
                    </div>
                  </EuiPanel>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
            <EuiSpacer size="l" />
            <EuiTitle size="xxs">
              <h3>
                {i18n.translate('discover.entitySimulation.entityDetails', {
                  defaultMessage: 'Entity details',
                })}
              </h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiPanel paddingSize="m" hasBorder>
              <EuiFlexGroup direction="column" gutterSize="s">
                <EuiText size="s">
                  <strong>Entity ID:</strong> {entity.entityId}
                </EuiText>
                <EuiText size="s">
                  <strong>
                    {i18n.translate('discover.entitySimulation.creationDate', {
                      defaultMessage: 'Creation date',
                    })}
                    :{' '}
                  </strong>
                  {entity.creationDate}
                </EuiText>
                <EuiText size="s">
                  <strong>
                    {i18n.translate('discover.entitySimulation.lastUpdated', {
                      defaultMessage: 'Last update',
                    })}
                    :{' '}
                  </strong>
                  {entity.lastUpdatedDetail}
                </EuiText>
                <EuiText size="s">
                  <strong>
                    {i18n.translate('discover.entitySimulation.versioning', {
                      defaultMessage: 'Versioning',
                    })}
                    :{' '}
                  </strong>
                  {entity.versionLabel} · {entity.deploymentLabel}
                </EuiText>
              </EuiFlexGroup>
            </EuiPanel>
            <EuiSpacer size="m" />
            <EuiTitle size="xxs">
              <h3>
                {i18n.translate('discover.entitySimulation.ownership', {
                  defaultMessage: 'Ownership',
                })}
              </h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiPanel paddingSize="m" hasBorder>
              <EuiText size="s">
                Slack {entity.ownerSlack} · {entity.ownerEmail}
              </EuiText>
            </EuiPanel>
            <EuiSpacer size="m" />
            <EuiAccordion
              id="entitySimulationSecurity"
              buttonContent={i18n.translate('discover.entitySimulation.securitySignals', {
                defaultMessage: 'Security signals',
              })}
            >
              <EuiText size="s" color="subdued">
                {i18n.translate('discover.entitySimulation.securityPlaceholder', {
                  defaultMessage:
                    'Simulated: vulnerabilities, threat detections, and anomalous access would appear here when security integrations are configured.',
                })}
              </EuiText>
            </EuiAccordion>
          </>
        )}

        {selectedTab === TAB_METRICS && (
          <>
            <EuiFlexGroup alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiSwitch
                  label={i18n.translate('discover.entitySimulation.surfaceEvents', {
                    defaultMessage: 'Surface events on graphs',
                  })}
                  checked={surfaceEvents}
                  onChange={(e) => setSurfaceEvents(e.target.checked)}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="l" />
            <EuiTitle size="xxs">
              <h3>
                {i18n.translate('discover.entitySimulation.goldenSignalsCharts', {
                  defaultMessage: 'Golden signals',
                })}
              </h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <MetricLineChart
              data={entity.latencySeries}
              color={euiTheme.colors.vis.euiColorVis2}
              name="latency"
            />
            <EuiSpacer size="l" />
            <MetricLineChart
              data={entity.errorRateSeries}
              color={euiTheme.colors.dangerText}
              name="error rate"
            />
            <EuiSpacer size="l" />
            <MetricLineChart
              data={entity.throughputSeries}
              color={euiTheme.colors.successText}
              name="throughput"
            />
            <EuiSpacer size="l" />
            <EuiTitle size="xxs">
              <h3>
                {i18n.translate('discover.entitySimulation.otherMetrics', {
                  defaultMessage: 'Other metrics',
                })}
              </h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <MetricLineChart
              data={entity.networkInSeries}
              color={euiTheme.colors.vis.euiColorVis5}
              name="network in"
            />
            <EuiSpacer size="m" />
            <MetricLineChart
              data={entity.networkOutSeries}
              color={euiTheme.colors.vis.euiColorVis7}
              name="network out"
            />
          </>
        )}

        {selectedTab === TAB_LOGS && (
          <>
            <EuiTitle size="xxs">
              <h3>{entity.logsTitle}</h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiBasicTable
              items={entity.logRows}
              columns={logColumns}
              tableLayout="auto"
              tableCaption={i18n.translate('discover.entitySimulation.logsTableCaption', {
                defaultMessage: 'Log lines associated with this entity (simulated)',
              })}
            />
          </>
        )}

        {selectedTab === TAB_ALERTS && (
          <>
            <EuiText>
              <h2>
                <EuiText color="danger" size="xl" component="span">
                  {entity.activeAlertsCount}
                </EuiText>{' '}
                <EuiText size="s" color="subdued" component="span">
                  {i18n.translate('discover.entitySimulation.activeAlertsOf', {
                    defaultMessage: 'active alerts ({total} total)',
                    values: { total: entity.activeAlertsTotal },
                  })}
                </EuiText>
              </h2>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiTitle size="xxs">
              <h3>
                {i18n.translate('discover.entitySimulation.activeAlertsOverTime', {
                  defaultMessage: 'Active alerts over time',
                })}
              </h3>
            </EuiTitle>
            <MetricLineChart
              data={entity.activeAlertsSeries}
              color={euiTheme.colors.dangerText}
              name="alerts"
            />
            <EuiSpacer size="l" />
            <EuiBasicTable
              items={entity.alertRows}
              columns={alertColumns}
              tableLayout="auto"
              tableCaption={i18n.translate('discover.entitySimulation.alertsTableCaption', {
                defaultMessage: 'Alert rules firing for this entity (simulated)',
              })}
            />
          </>
        )}

        {selectedTab === TAB_RELATIONSHIPS && (
          <>
            <RelationshipsDiagram entity={entity} />
            <EuiSpacer size="l" />
            <EuiBasicTable
              items={entity.relatedEntities}
              columns={relatedColumns}
              tableLayout="auto"
              tableCaption={i18n.translate(
                'discover.entitySimulation.relatedEntitiesTableCaption',
                {
                  defaultMessage: 'Related entities for this service (simulated)',
                }
              )}
            />
          </>
        )}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="discuss">
              {i18n.translate('discover.entitySimulation.addToChat', {
                defaultMessage: 'Add to chat',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill iconType="wrench">
              {i18n.translate('discover.entitySimulation.takeAction', {
                defaultMessage: 'Take action',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiText size="xs" color="subdued" textAlign="center">
          {i18n.translate('discover.entitySimulation.demoDisclaimer', {
            defaultMessage: 'Simulation only — data is not live.',
          })}{' '}
          <EuiButtonEmpty
            size="xs"
            flush="both"
            onClick={() => {}}
            data-test-subj="entitySimulationLearnMore"
          >
            {i18n.translate('discover.entitySimulation.learnMore', {
              defaultMessage: 'Learn more',
            })}
          </EuiButtonEmpty>
        </EuiText>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
