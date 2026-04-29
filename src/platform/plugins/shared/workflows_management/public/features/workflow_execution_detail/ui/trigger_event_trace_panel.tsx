/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiAccordion,
  EuiCallOut,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useQuery } from '@kbn/react-query';
import type { JsonValue } from '@kbn/utility-types';
import type { WorkflowTriggerEventDispatchDto } from '@kbn/workflows';
import { useWorkflowsApi } from '@kbn/workflows-ui';
import { EventTraceFlowGraph } from './event_trace_flow/event_trace_flow_graph';
import { PLUGIN_ID } from '../../../../common';
import { useKibana } from '../../../hooks/use_kibana';
import { ExecutionDataViewer } from '../../../shared/ui/execution_data_viewer/execution_data_viewer';

export interface TriggerEventTracePanelProps {
  executionId: string;
}

function dispatchSummaryItems(dispatch: WorkflowTriggerEventDispatchDto) {
  return [
    {
      title: i18n.translate('workflowsManagement.triggerEventTrace.field.eventId', {
        defaultMessage: 'Dispatch id',
      }),
      description: <EuiText size="s">{dispatch.eventId}</EuiText>,
    },
    {
      title: i18n.translate('workflowsManagement.triggerEventTrace.field.triggerId', {
        defaultMessage: 'Trigger',
      }),
      description: <EuiText size="s">{dispatch.triggerId}</EuiText>,
    },
    {
      title: i18n.translate('workflowsManagement.triggerEventTrace.field.timestamp', {
        defaultMessage: 'Timestamp',
      }),
      description: <EuiText size="s">{dispatch['@timestamp']}</EuiText>,
    },
  ];
}

function useSubscriptionLinks(
  dispatch: WorkflowTriggerEventDispatchDto | null | undefined,
  workflowHref: (workflowId: string) => string
) {
  return useMemo(() => {
    if (!dispatch?.subscriptions?.length) {
      return null;
    }
    return (
      <EuiFlexGroup direction="column" gutterSize="xs">
        {dispatch.subscriptions.map((wfId) => (
          <EuiFlexItem key={wfId}>
            <EuiLink href={workflowHref(wfId)} external={false}>
              {wfId}
            </EuiLink>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    );
  }, [dispatch?.subscriptions, workflowHref]);
}

export const TriggerEventTracePanel = React.memo<TriggerEventTracePanelProps>(({ executionId }) => {
  const api = useWorkflowsApi();
  const { application } = useKibana().services;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['workflowTriggerEventTrace', executionId],
    queryFn: () => api.getTriggerEventTrace(executionId),
    staleTime: 60_000,
  });

  const workflowHref = useCallback(
    (workflowId: string) =>
      application.getUrlForApp(PLUGIN_ID, {
        path: `/${workflowId}`,
      }),
    [application]
  );

  const fallbackSubscriptionLinks = useSubscriptionLinks(data?.dispatch, workflowHref);

  if (isLoading) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (isError) {
    const message = error instanceof Error ? error.message : String(error);
    return (
      <EuiCallOut
        title={i18n.translate('workflowsManagement.triggerEventTrace.loadErrorTitle', {
          defaultMessage: 'Could not load event trace',
        })}
        color="danger"
        iconType="error"
        announceOnMount={false}
      >
        {message}
      </EuiCallOut>
    );
  }

  if (!data) {
    return null;
  }

  if (!data.eligible) {
    return (
      <EuiCallOut
        title={i18n.translate('workflowsManagement.triggerEventTrace.notEligibleTitle', {
          defaultMessage: 'Event trace is only for event-driven runs',
        })}
        iconType="iInCircle"
        announceOnMount={false}
      >
        <FormattedMessage
          id="workflowsManagement.triggerEventTrace.notEligibleBody"
          defaultMessage="This execution was not started by a custom event trigger, so there is no trigger dispatch audit to show."
        />
      </EuiCallOut>
    );
  }

  if (data.fetchError) {
    return (
      <EuiCallOut
        title={i18n.translate('workflowsManagement.triggerEventTrace.fetchErrorTitle', {
          defaultMessage: 'Could not read trigger event audit data',
        })}
        color="warning"
        iconType="alert"
        announceOnMount={false}
      >
        {data.fetchError}
      </EuiCallOut>
    );
  }

  if (data.missingDispatchEventId) {
    return (
      <EuiCallOut
        title={i18n.translate('workflowsManagement.triggerEventTrace.missingIdTitle', {
          defaultMessage: 'No dispatch id on this execution',
        })}
        iconType="iInCircle"
        announceOnMount={false}
      >
        <FormattedMessage
          id="workflowsManagement.triggerEventTrace.missingIdBody"
          defaultMessage="The platform did not record a dispatch id (for example, trigger-event logging may be disabled, or this run predates correlation). You can still inspect the trigger input on the Input tab."
        />
      </EuiCallOut>
    );
  }

  return (
    <div
      data-test-subj="workflowTriggerEventTracePanel"
      css={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        height: '100%',
      }}
    >
      {data.eventCausalChain.length > 0 ? (
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          <div css={{ flexShrink: 0 }}>
            <EuiTitle size="xxs">
              <h4>
                <FormattedMessage
                  id="workflowsManagement.triggerEventTrace.causalChainTitle"
                  defaultMessage="Event chain"
                />
              </h4>
            </EuiTitle>
            <EuiSpacer size="xs" />
            <EuiText size="xs" color="subdued">
              <FormattedMessage
                id="workflowsManagement.triggerEventTrace.causalChainDescription"
                defaultMessage="Read top to bottom: each step is a dispatch or workflow run that led to this execution."
              />
            </EuiText>
            <EuiSpacer size="m" />
          </div>
          <EventTraceFlowGraph chain={data.eventCausalChain} />
        </div>
      ) : data.dispatch ? (
        <EuiPanel paddingSize="m" hasShadow={false} hasBorder>
          <EuiTitle size="xxs">
            <h4>
              <FormattedMessage
                id="workflowsManagement.triggerEventTrace.dispatchSectionTitle"
                defaultMessage="Dispatch that started this run"
              />
            </h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiDescriptionList
            listItems={[
              ...dispatchSummaryItems(data.dispatch),
              {
                title: i18n.translate('workflowsManagement.triggerEventTrace.field.subscriptions', {
                  defaultMessage: 'Matched workflows',
                }),
                description: fallbackSubscriptionLinks ?? (
                  <EuiText size="s" color="subdued">
                    <FormattedMessage
                      id="workflowsManagement.triggerEventTrace.noSubscriptions"
                      defaultMessage="None"
                    />
                  </EuiText>
                ),
              },
            ]}
          />
          <EuiSpacer size="m" />
          <ExecutionDataViewer
            data={data.dispatch.payload as JsonValue}
            title={i18n.translate('workflowsManagement.triggerEventTrace.payloadViewerTitle', {
              defaultMessage: 'Payload',
            })}
            fieldPathActionsPrefix="event"
          />
        </EuiPanel>
      ) : (
        <EuiCallOut
          title={i18n.translate('workflowsManagement.triggerEventTrace.noDispatchDocTitle', {
            defaultMessage: 'No matching audit document',
          })}
          iconType="search"
          color="subdued"
          announceOnMount={false}
        >
          <FormattedMessage
            id="workflowsManagement.triggerEventTrace.noDispatchDocBody"
            defaultMessage="No row was found in the trigger-events stream for dispatch id {dispatchEventId}. Data may have expired, or logging was off when the event was emitted."
            values={{
              dispatchEventId: data.dispatchEventId ?? '',
            }}
          />
        </EuiCallOut>
      )}

      {data.downstreamDispatches.length > 0 ? (
        <div css={{ flexShrink: 0 }}>
          <EuiSpacer size="l" />
          <EuiTitle size="xxs">
            <h4>
              <FormattedMessage
                id="workflowsManagement.triggerEventTrace.downstreamTitle"
                defaultMessage="Events emitted during this run"
              />
            </h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          {data.downstreamDispatches.map((d, i) => (
            <EuiAccordion
              key={`${d.eventId}-${i}`}
              id={`downstream-${d.eventId}-${i}`}
              buttonContent={`${d.triggerId} · ${d['@timestamp']}`}
              paddingSize="s"
            >
              <EuiDescriptionList listItems={dispatchSummaryItems(d)} />
              <EuiSpacer size="s" />
              <ExecutionDataViewer
                data={d.payload as JsonValue}
                title={i18n.translate(
                  'workflowsManagement.triggerEventTrace.downstreamPayloadTitle',
                  {
                    defaultMessage: 'Payload',
                  }
                )}
                fieldPathActionsPrefix="event"
              />
            </EuiAccordion>
          ))}
        </div>
      ) : null}
    </div>
  );
});

TriggerEventTracePanel.displayName = 'TriggerEventTracePanel';
