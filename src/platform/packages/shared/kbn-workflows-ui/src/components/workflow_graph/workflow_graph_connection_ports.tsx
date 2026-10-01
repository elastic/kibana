/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { euiCanAnimate, euiFocusRing, EuiIcon, EuiToolTip, useEuiTheme } from '@elastic/eui';
import type { EuiToolTipRef } from '@elastic/eui';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { LayoutDirection } from '@kbn/workflows';
import type { NodePortTargets } from './compute_insertion_points';
import {
  ERROR_PORT_ALONG,
  ERROR_PORT_FRACTION,
  IF_PORT_FALSE,
  IF_PORT_TRUE,
  PORT_DOT_SIZE,
  PORT_EXPANDED_SIZE,
  PORT_HIT_SIZE,
  PORT_STRADDLE_OUTSET,
  STEP_PORT,
  errorPortEdgeStyle,
  isHorizontalDirection,
} from './port_geometry';
import type {
  WorkflowGraphAnchorRect,
  WorkflowGraphEditActions,
} from './workflow_graph_actions_context';
import { useWorkflowGraphActions } from './workflow_graph_actions_context';
import { toAnchorRect } from './workflow_graph_insert_control';

export {
  ERROR_PORT_ALONG,
  ERROR_PORT_FRACTION,
  IF_PORT_FALSE,
  IF_PORT_TRUE,
  PORT_DOT_SIZE,
  PORT_EXPANDED_SIZE,
  PORT_HIT_SIZE,
  PORT_STRADDLE_OUTSET,
  STEP_PORT,
};
/** @deprecated Prefer ERROR_PORT_FRACTION. */
export { ERROR_PORT_INSET, ERROR_PORT_OFFSET, IF_PORT_ERROR, STEP_ERROR_PORT } from './port_geometry';
/** @deprecated Prefer IF_PORT_FALSE / IF_PORT_TRUE. */
export const BRANCH_FALSE_LEFT = IF_PORT_FALSE;
export const BRANCH_TRUE_LEFT = IF_PORT_TRUE;
/** @deprecated Prefer ERROR_PORT_ALONG. */
export const ERROR_PORT_LEFT = ERROR_PORT_ALONG;

/** Shared spring used by port pin expand-on-hover. */
export const PORT_SPRING_EASE = 'cubic-bezier(.34,1.56,.64,1)';
export const PORT_SPRING_MS = '180ms';

/** Hover dwell before the port explainer tooltip appears. */
const PORT_TOOLTIP_DELAY_MS = 1000;

const SPRING = PORT_SPRING_EASE;
const SPRING_MS = PORT_SPRING_MS;

export interface WorkflowGraphConnectionPortsProps {
  readonly ports: NodePortTargets;
  readonly edit: WorkflowGraphEditActions;
  /** Node surface hover / focus-within — reveals the failure port. */
  readonly nodeHovered: boolean;
  /** Layout direction — failure port stays on the bottom edge in both axes. */
  readonly direction: LayoutDirection;
}

/**
 * Node-anchored failure port only. Add-step lives on wires / terminal stubs
 * (see WorkflowGraphEditOverlays). Absolutely positioned on the bottom edge;
 * contributes zero layout size to the node card.
 */
export function WorkflowGraphConnectionPorts({
  ports,
  edit,
  nodeHovered,
  direction,
}: WorkflowGraphConnectionPortsProps) {
  const { euiTheme } = useEuiTheme();
  const euiThemeContext = useEuiTheme();
  const isHorizontal = isHorizontalDirection(direction);
  const { pendingInsert } = useWorkflowGraphActions();
  const creatingError =
    pendingInsert?.context.mode === 'error' &&
    pendingInsert.context.stepId === ports.errorStepId;

  const insertError = useCallback(
    (stepId: string, anchor: WorkflowGraphAnchorRect) => {
      edit.onInsert({ mode: 'error', stepId }, anchor);
    },
    [edit]
  );

  const addErrorLabel = i18n.translate('workflowsUi.graph.port.addErrorPath', {
    defaultMessage: 'Add error path',
  });
  const addErrorTip = i18n.translate('workflowsUi.graph.port.addErrorPathTip', {
    defaultMessage: 'Add failure step',
  });

  if (!ports.errorStepId && !ports.errorConnected) {
    return null;
  }

  return (
    <div
      data-test-subj="workflowGraphConnectionPorts"
      data-direction={direction}
      css={{
        position: 'absolute',
        // Failure port is always on the bottom edge (orientation-invariant).
        left: 0,
        right: 0,
        bottom: 0,
        height: 0,
        width: '100%',
        pointerEvents: 'none',
        overflow: 'visible',
      }}
      // Keep direction attribute for tests / a11y even though the port is bottom-only.
      data-layout={isHorizontal ? 'LR' : 'TB'}
    >
      {ports.errorStepId && (
        <PortButton
          ariaLabel={addErrorLabel}
          tip={addErrorTip}
          nodeHovered={nodeHovered}
          fill={euiTheme.colors.danger}
          ring={euiTheme.colors.backgroundBasePlain}
          restFill={euiTheme.colors.danger}
          euiThemeContext={euiThemeContext}
          onActivate={(anchor) => insertError(ports.errorStepId!, anchor)}
          data-test-subj="workflowGraphPort-error"
          iconType="warning"
          forceActive={creatingError}
        />
      )}
      {ports.errorConnected && !ports.errorStepId && <ConnectedErrorPort />}
    </div>
  );
}

/**
 * Non-interactive error port once a fallback route exists — persistent rest
 * dot so the failure edge never emerges without a visible origin anchor.
 */
function ConnectedErrorPort() {
  const { euiTheme } = useEuiTheme();
  return (
    <span
      aria-hidden={true}
      data-test-subj="workflowGraphPort-errorConnected"
      css={{
        position: 'absolute',
        ...errorPortEdgeStyle(PORT_DOT_SIZE / 2),
        width: PORT_DOT_SIZE,
        height: PORT_DOT_SIZE,
        borderRadius: '50%',
        background: euiTheme.colors.danger,
        boxShadow: `0 0 0 2px ${euiTheme.colors.backgroundBasePlain}`,
        pointerEvents: 'none',
        zIndex: 5,
        opacity: 1,
      }}
    />
  );
}

function PortButton({
  ariaLabel,
  tip,
  nodeHovered,
  fill,
  ring,
  restFill,
  euiThemeContext,
  onActivate,
  'data-test-subj': dataTestSubj,
  iconType,
  forceActive = false,
}: {
  readonly ariaLabel: string;
  readonly tip: string;
  readonly nodeHovered: boolean;
  readonly fill: string;
  readonly ring: string;
  readonly restFill: string;
  readonly euiThemeContext: ReturnType<typeof useEuiTheme>;
  readonly onActivate: (anchor: WorkflowGraphAnchorRect) => void;
  readonly 'data-test-subj': string;
  readonly iconType: 'plus' | 'warning';
  /** Error-path definition in progress — keep expanded/active without hover. */
  readonly forceActive?: boolean;
}) {
  const revealed = nodeHovered || forceActive;
  const expanded = forceActive || false;
  const tipRef = useRef<EuiToolTipRef>(null);
  const delayRef = useRef<number | undefined>(undefined);
  // EUI 119 removed tooltip delay — keep content empty until dwell elapses so
  // the built-in immediate showToolTip is a no-op, then reveal + show.
  const [tipContent, setTipContent] = useState<string | undefined>(undefined);

  const clearDelay = useCallback(() => {
    if (delayRef.current !== undefined) {
      window.clearTimeout(delayRef.current);
      delayRef.current = undefined;
    }
  }, []);

  useEffect(() => () => clearDelay(), [clearDelay]);

  useEffect(() => {
    if (tipContent) tipRef.current?.showToolTip();
  }, [tipContent]);

  // Hit box straddles the bottom border so the pin sits on the edge.
  const edgeStyle = errorPortEdgeStyle(PORT_HIT_SIZE / 2);

  return (
    <EuiToolTip
      ref={tipRef}
      content={tipContent}
      position="top"
      disableScreenReaderOutput
      display="block"
      repositionOnScroll
      anchorProps={{
        css: [
          {
            position: 'absolute' as const,
            ...edgeStyle,
            width: PORT_HIT_SIZE,
            height: PORT_HIT_SIZE,
            zIndex: 5,
            opacity: revealed ? 1 : 0,
            pointerEvents: revealed ? ('auto' as const) : ('none' as const),
            '&:focus-within': { opacity: 1, pointerEvents: 'auto' },
          },
        ],
        onMouseEnter: () => {
          clearDelay();
          delayRef.current = window.setTimeout(() => {
            setTipContent(tip);
          }, PORT_TOOLTIP_DELAY_MS);
        },
        onMouseLeave: () => {
          clearDelay();
          setTipContent(undefined);
          tipRef.current?.hideToolTip();
        },
      }}
    >
      <button
        type="button"
        aria-label={ariaLabel}
        data-test-subj={dataTestSubj}
        data-port-kind="error"
        data-port-active={forceActive ? 'true' : undefined}
        onClick={(e) => {
          e.stopPropagation();
          clearDelay();
          setTipContent(undefined);
          tipRef.current?.hideToolTip();
          onActivate(toAnchorRect(e.currentTarget));
        }}
        onMouseDown={(e) => e.stopPropagation()}
        css={[
          {
            width: '100%',
            height: '100%',
            padding: 0,
            margin: 0,
            border: 'none',
            background: 'transparent',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            '& .workflowGraphPortPin': {
              width: PORT_DOT_SIZE,
              height: PORT_DOT_SIZE,
              background: restFill,
              border: 'none',
              boxShadow: `0 0 0 2px ${ring}`,
              color: ring,
            },
            '& .workflowGraphPortPin > span': { opacity: 0 },
            ...(revealed
              ? {
                  '& .workflowGraphPortPin': {
                    width: forceActive ? PORT_EXPANDED_SIZE : PORT_DOT_SIZE,
                    height: forceActive ? PORT_EXPANDED_SIZE : PORT_DOT_SIZE,
                    background: forceActive ? fill : restFill,
                    border: 'none',
                    boxShadow: `0 0 0 2px ${ring}`,
                    color: ring,
                  },
                  '& .workflowGraphPortPin > span': {
                    opacity: forceActive ? 1 : 0,
                  },
                }
              : {}),
            ...(expanded
              ? {
                  '& .workflowGraphPortPin': {
                    width: PORT_EXPANDED_SIZE,
                    height: PORT_EXPANDED_SIZE,
                    background: fill,
                    border: 'none',
                    boxShadow: `0 0 0 2px ${ring}`,
                    color: ring,
                  },
                  '& .workflowGraphPortPin > span': { opacity: 1 },
                }
              : {}),
            '&:hover .workflowGraphPortPin, &:focus-visible .workflowGraphPortPin': {
              width: PORT_EXPANDED_SIZE,
              height: PORT_EXPANDED_SIZE,
              background: fill,
              border: 'none',
              boxShadow: `0 0 0 2px ${ring}`,
              color: ring,
            },
            '&:hover .workflowGraphPortPin > span, &:focus-visible .workflowGraphPortPin > span': {
              opacity: 1,
            },
          },
          { '&:focus-visible': euiFocusRing(euiThemeContext) },
        ]}
      >
        <span
          className="workflowGraphPortPin"
          css={{
            borderRadius: '50%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: '0 0 auto',
            boxSizing: 'border-box',
            [euiCanAnimate]: {
              transition: `width ${SPRING_MS} ${SPRING}, height ${SPRING_MS} ${SPRING}, background 120ms ease, border-color 120ms ease, box-shadow 120ms ease`,
            },
            '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
            '& > span': {
              display: 'inline-flex',
              [euiCanAnimate]: { transition: 'opacity 100ms ease' },
              '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
            },
          }}
        >
          <span>
            <EuiIcon type={iconType} size="s" aria-hidden={true} />
          </span>
        </span>
      </button>
    </EuiToolTip>
  );
}
