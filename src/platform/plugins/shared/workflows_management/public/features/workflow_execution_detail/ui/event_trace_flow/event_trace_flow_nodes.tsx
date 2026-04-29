/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  euiFontSize,
  EuiPopover,
  euiShadow,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Handle, Position } from '@xyflow/react';
import React, { useCallback, useMemo, useState } from 'react';
import { FormattedMessage, useI18n } from '@kbn/i18n-react';
import {
  EVENT_TRACE_DISPATCH_NODE_ROW_HEIGHT,
  type EventTraceDispatchNodeData,
  type EventTraceExternalNodeData,
  type EventTraceRunNodeData,
} from './build_event_trace_flow_graph';
import { RegistryTriggerIcon } from '../../../../shared/ui/triggers/registry_trigger_icon';

/** Fixed circle; node cell is full column width so edges stay vertical. */
const EVENT_TRACE_TRIGGER_CIRCLE_PX = 36;

/** Invisible anchors: edges still attach; no visible handle dots. */
const eventTraceHandleCss = css`
  opacity: 0 !important;
  width: 8px !important;
  height: 8px !important;
  min-width: 8px !important;
  min-height: 8px !important;
  border: none !important;
  background: transparent !important;
  pointer-events: none !important;
`;

function EventTraceDispatchEventDetailsBody({
  triggerId,
  eventId,
  timestamp,
  subscriptions,
  payloadJson,
}: Pick<
  EventTraceDispatchNodeData,
  'triggerId' | 'eventId' | 'timestamp' | 'subscriptions' | 'payloadJson'
>) {
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;
  const subscriptionText = subscriptions.length > 0 ? subscriptions.join(', ') : '—';
  return (
    <div
      css={css`
        max-width: 360px;
        max-height: 280px;
        overflow: auto;
        text-align: left;
      `}
    >
      <EuiText size="xs">
        <strong>
          <FormattedMessage
            id="workflowsManagement.eventTraceFlow.tooltipTriggerId"
            defaultMessage="Trigger"
          />
        </strong>
        <div css={{ wordBreak: 'break-all' }}>{triggerId}</div>
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiText size="xs">
        <strong>
          <FormattedMessage
            id="workflowsManagement.eventTraceFlow.tooltipEventId"
            defaultMessage="Event id"
          />
        </strong>
        <div css={{ wordBreak: 'break-all' }}>{eventId}</div>
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiText size="xs">
        <strong>
          <FormattedMessage
            id="workflowsManagement.eventTraceFlow.tooltipTimestamp"
            defaultMessage="Timestamp"
          />
        </strong>
        <div>{timestamp || '—'}</div>
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiText size="xs">
        <strong>
          <FormattedMessage
            id="workflowsManagement.eventTraceFlow.tooltipSubscriptions"
            defaultMessage="Subscriptions"
          />
        </strong>
        <div css={{ wordBreak: 'break-all' }}>{subscriptionText}</div>
      </EuiText>
      {payloadJson.length > 0 ? (
        <>
          <EuiSpacer size="xs" />
          <EuiText size="xs">
            <strong>
              <FormattedMessage
                id="workflowsManagement.eventTraceFlow.tooltipPayload"
                defaultMessage="Payload"
              />
            </strong>
            <pre
              css={[
                css`
                  margin: ${euiTheme.size.xs} 0 0;
                  font-family: ${euiTheme.font.familyCode};
                  white-space: pre-wrap;
                  word-break: break-word;
                `,
                css({ ...euiFontSize(euiThemeContext, 'xs') }),
              ]}
            >
              {payloadJson}
            </pre>
          </EuiText>
        </>
      ) : null}
    </div>
  );
}

export function EventTraceExternalNode(_node: Node<EventTraceExternalNodeData>) {
  const { euiTheme } = useEuiTheme();
  const intl = useI18n();
  const ariaLabel = intl.formatMessage({
    id: 'workflowsManagement.eventTraceFlow.externalAriaLabel',
    defaultMessage: 'External event source',
  });
  return (
    <div
      role="img"
      aria-label={ariaLabel}
      css={css`
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
      `}
    >
      <span
        css={css`
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: ${euiTheme.colors.primary};
        `}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={false}
        isConnectableStart={false}
        isConnectableEnd={false}
        css={eventTraceHandleCss}
      />
    </div>
  );
}

export function EventTraceDispatchNode({ data }: NodeProps<Node<EventTraceDispatchNodeData>>) {
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;
  const intl = useI18n();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { triggerId, eventId, timestamp, subscriptions, payloadJson } = data;
  const dispatchAriaLabel = intl.formatMessage(
    {
      id: 'workflowsManagement.eventTraceFlow.dispatchAriaLabel',
      defaultMessage: 'Trigger dispatch {triggerId}. Open to view full event details.',
    },
    { triggerId }
  );
  const popoverTitleId = useGeneratedHtmlId({ prefix: 'eventTraceDispatchDetailsTitle' });

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  const closeDetailsLabel = intl.formatMessage({
    id: 'workflowsManagement.eventTraceFlow.closeEventDetails',
    defaultMessage: 'Close event details',
  });

  const detailsBody = useMemo(
    () => (
      <EventTraceDispatchEventDetailsBody
        triggerId={triggerId}
        eventId={eventId}
        timestamp={timestamp}
        subscriptions={subscriptions}
        payloadJson={payloadJson}
      />
    ),
    [triggerId, eventId, timestamp, subscriptions, payloadJson]
  );

  return (
    <div
      className="nopan nodrag"
      style={{
        width: '100%',
        height: '100%',
        minHeight: EVENT_TRACE_DISPATCH_NODE_ROW_HEIGHT,
        position: 'relative',
        boxSizing: 'border-box',
        pointerEvents: 'auto',
      }}
    >
      {/*
        Handles first in DOM so the full-cell popover button stacks above; with default isConnectable they
        get pointer-events: all (connectionindicator) and steal clicks from the trigger.
      */}
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={false}
        isConnectableStart={false}
        isConnectableEnd={false}
        css={eventTraceHandleCss}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={false}
        isConnectableStart={false}
        isConnectableEnd={false}
        css={eventTraceHandleCss}
      />
      <EuiPopover
        aria-labelledby={popoverTitleId}
        className="nopan nodrag"
        display="block"
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        anchorPosition="downCenter"
        panelPaddingSize="none"
        repositionOnScroll
        ownFocus={false}
        style={{ width: '100%', height: '100%', position: 'relative' }}
        button={
          <button
            type="button"
            className="nopan nodrag"
            aria-expanded={isPopoverOpen}
            aria-haspopup="dialog"
            aria-label={dispatchAriaLabel}
            onClick={() => setIsPopoverOpen((open) => !open)}
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            css={css`
              margin: 0;
              padding: 0;
              border: none;
              background: transparent;
              cursor: pointer;
              appearance: none;
              font: inherit;
              color: inherit;
              box-sizing: border-box;
            `}
          >
            <span
              css={[
                css`
                  position: relative;
                  flex-shrink: 0;
                  width: ${EVENT_TRACE_TRIGGER_CIRCLE_PX}px;
                  height: ${EVENT_TRACE_TRIGGER_CIRCLE_PX}px;
                  border-radius: 50%;
                  border: 2px solid ${euiTheme.colors.borderBasePrimary};
                  background: ${euiTheme.colors.backgroundBasePlain};
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  box-sizing: border-box;
                  pointer-events: none;
                `,
                euiShadow(euiThemeContext, 'xs', { direction: 'down' }),
              ]}
            >
              <RegistryTriggerIcon triggerType={triggerId} size="s" color="primary" aria-hidden />
            </span>
          </button>
        }
      >
        <div
          css={css`
            padding: ${euiTheme.size.s} ${euiTheme.size.m};
            border-bottom: ${euiTheme.border.thin};
            border-color: ${euiTheme.border.color};
          `}
        >
          <EuiFlexGroup
            alignItems="center"
            justifyContent="spaceBetween"
            gutterSize="s"
            responsive={false}
          >
            <EuiFlexItem grow={false} css={{ minWidth: 0 }}>
              <EuiText size="s" css={{ fontWeight: euiTheme.font.weight.semiBold }}>
                <span id={popoverTitleId}>
                  <FormattedMessage
                    id="workflowsManagement.eventTraceFlow.dispatchDetailsTitle"
                    defaultMessage="Event details"
                  />
                </span>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType="cross"
                size="xs"
                color="text"
                aria-label={closeDetailsLabel}
                onClick={closePopover}
                data-test-subj="workflowEventTraceCloseEventDetails"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
        <div css={{ padding: euiTheme.size.m }}>{detailsBody}</div>
      </EuiPopover>
    </div>
  );
}

export function EventTraceRunNode(node: Node<EventTraceRunNodeData>) {
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;
  const { workflowId, workflowName, executionId, isCurrent, showSourceHandle } = node.data;
  const title = workflowName?.trim() || workflowId || executionId;
  const borderColor = isCurrent ? euiTheme.colors.primary : euiTheme.colors.borderBasePrimary;
  return (
    <div
      css={[
        css`
          position: relative;
          padding: ${euiTheme.size.s} ${euiTheme.size.m};
          border-radius: ${euiTheme.border.radius.medium};
          border: 2px solid ${borderColor};
          background: ${euiTheme.colors.backgroundBasePlain};
          min-height: 56px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 2px;
        `,
        euiShadow(euiThemeContext, 'xs', { direction: 'down' }),
      ]}
    >
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={false}
        isConnectableStart={false}
        isConnectableEnd={false}
        css={eventTraceHandleCss}
      />
      <EuiText size="s" css={{ fontWeight: euiTheme.font.weight.bold, wordBreak: 'break-word' }}>
        {title}
      </EuiText>
      <EuiText
        size="xs"
        color="subdued"
        css={{
          ...euiFontSize(euiThemeContext, 'xxs'),
          lineHeight: 1.2,
          wordBreak: 'break-all',
        }}
      >
        {executionId}
      </EuiText>
      {isCurrent ? (
        <EuiBadge color="hollow" css={{ alignSelf: 'flex-start', marginTop: 2 }}>
          <FormattedMessage
            id="workflowsManagement.eventTraceFlow.currentRunBadge"
            defaultMessage="This run"
          />
        </EuiBadge>
      ) : null}
      {showSourceHandle ? (
        <Handle
          type="source"
          position={Position.Bottom}
          isConnectable={false}
          isConnectableStart={false}
          isConnectableEnd={false}
          css={eventTraceHandleCss}
        />
      ) : null}
    </div>
  );
}
