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
import type { NodePortTargets, StepPortTarget } from './compute_insertion_points';
import {
  ERROR_PORT_INSET,
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
  ERROR_PORT_INSET,
  IF_PORT_FALSE,
  IF_PORT_TRUE,
  PORT_DOT_SIZE,
  PORT_EXPANDED_SIZE,
  PORT_HIT_SIZE,
  PORT_STRADDLE_OUTSET,
  STEP_PORT,
};
/** @deprecated Prefer ERROR_PORT_INSET. */
export { ERROR_PORT_OFFSET, IF_PORT_ERROR, STEP_ERROR_PORT } from './port_geometry';
/** @deprecated Prefer IF_PORT_FALSE / IF_PORT_TRUE. */
export const BRANCH_FALSE_LEFT = IF_PORT_FALSE;
export const BRANCH_TRUE_LEFT = IF_PORT_TRUE;
/** @deprecated Prefer ERROR_PORT_INSET positioning. */
export const ERROR_PORT_LEFT = `calc(100% - ${ERROR_PORT_INSET}px)`;

/** Shared spring used by ports and trailing node actions. */
export const PORT_SPRING_EASE = 'cubic-bezier(.34,1.56,.64,1)';
export const PORT_SPRING_MS = '180ms';

/** Hover dwell before the port explainer tooltip appears. */
const PORT_TOOLTIP_DELAY_MS = 1000;

const SPRING = PORT_SPRING_EASE;
const SPRING_MS = PORT_SPRING_MS;

export interface WorkflowGraphConnectionPortsProps {
  readonly ports: NodePortTargets;
  readonly edit: WorkflowGraphEditActions;
  /** Node surface hover / focus-within — expands flow ports and reveals error. */
  readonly nodeHovered: boolean;
  /** Layout direction — ports sit on the bottom (TB) or right (LR) edge. */
  readonly direction: LayoutDirection;
}

/**
 * Node-anchored connection points. Absolutely positioned on the source edge;
 * contribute zero layout size to the node card.
 *
 * Flow ports (true → false) stay visible at rest; error ports are opacity-0
 * until the owning node is hovered or focused.
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

  const insertStep = useCallback(
    (target: StepPortTarget, anchor: WorkflowGraphAnchorRect) => {
      edit.onInsert(
        {
          mode: 'step',
          index: target.index,
          path: target.path,
          sourceNodeId: target.sourceNodeId,
        },
        anchor
      );
    },
    [edit]
  );

  const insertError = useCallback(
    (stepId: string, anchor: WorkflowGraphAnchorRect) => {
      edit.onInsert({ mode: 'error', stepId }, anchor);
    },
    [edit]
  );

  const addStepLabel = i18n.translate('workflowsUi.graph.port.addStep', {
    defaultMessage: 'Add step',
  });
  const addStepTip = i18n.translate('workflowsUi.graph.port.addStepTip', {
    defaultMessage: 'Add step',
  });
  const addTrueLabel = i18n.translate('workflowsUi.graph.port.addTruePath', {
    defaultMessage: 'Add step — true path',
  });
  const addTrueTip = i18n.translate('workflowsUi.graph.port.addTruePathTip', {
    defaultMessage: 'Add step (true)',
  });
  const addFalseLabel = i18n.translate('workflowsUi.graph.port.addFalsePath', {
    defaultMessage: 'Add step — false path',
  });
  const addFalseTip = i18n.translate('workflowsUi.graph.port.addFalsePathTip', {
    defaultMessage: 'Add step (false)',
  });
  const addErrorLabel = i18n.translate('workflowsUi.graph.port.addErrorPath', {
    defaultMessage: 'Add error path',
  });
  const addErrorTip = i18n.translate('workflowsUi.graph.port.addErrorPathTip', {
    defaultMessage: 'Add failure step',
  });

  const isIf = ports.then !== undefined || ports.else !== undefined;

  return (
    <div
      data-test-subj="workflowGraphConnectionPorts"
      data-direction={direction}
      css={{
        position: 'absolute',
        ...(isHorizontal
          ? { top: 0, bottom: 0, right: 0, width: 0, height: '100%' }
          : { left: 0, right: 0, bottom: 0, height: 0, width: '100%' }),
        pointerEvents: 'none',
        overflow: 'visible',
      }}
    >
      {ports.step && (
        <PortButton
          kind="step"
          along={STEP_PORT}
          isHorizontal={isHorizontal}
          ariaLabel={addStepLabel}
          tip={addStepTip}
          nodeHovered={nodeHovered}
          fill={euiTheme.colors.primary}
          ring={euiTheme.colors.backgroundBasePlain}
          restFill={euiTheme.colors.borderBaseProminent}
          euiThemeContext={euiThemeContext}
          onActivate={(anchor) => insertStep(ports.step!, anchor)}
          data-test-subj="workflowGraphPort-step"
          iconType="plus"
        />
      )}
      {isIf && ports.then && (
        <PortButton
          kind="step"
          along={IF_PORT_TRUE}
          isHorizontal={isHorizontal}
          ariaLabel={addTrueLabel}
          tip={addTrueTip}
          nodeHovered={nodeHovered}
          fill={euiTheme.colors.primary}
          ring={euiTheme.colors.backgroundBasePlain}
          restFill={euiTheme.colors.borderBaseProminent}
          euiThemeContext={euiThemeContext}
          onActivate={(anchor) => insertStep(ports.then!, anchor)}
          data-test-subj="workflowGraphPort-then"
          iconType="plus"
        />
      )}
      {isIf && ports.else && (
        <PortButton
          kind="step"
          along={IF_PORT_FALSE}
          isHorizontal={isHorizontal}
          ariaLabel={addFalseLabel}
          tip={addFalseTip}
          nodeHovered={nodeHovered}
          fill={euiTheme.colors.primary}
          ring={euiTheme.colors.backgroundBasePlain}
          restFill={euiTheme.colors.borderBaseProminent}
          euiThemeContext={euiThemeContext}
          onActivate={(anchor) => insertStep(ports.else!, anchor)}
          data-test-subj="workflowGraphPort-else"
          iconType="plus"
        />
      )}
      {ports.errorStepId && (
        <PortButton
          kind="error"
          isHorizontal={isHorizontal}
          ariaLabel={addErrorLabel}
          tip={addErrorTip}
          nodeHovered={nodeHovered}
          fill={euiTheme.colors.danger}
          ring={euiTheme.colors.backgroundBasePlain}
          restFill={euiTheme.colors.danger}
          euiThemeContext={euiThemeContext}
          onActivate={(anchor) => insertError(ports.errorStepId!, anchor)}
          data-test-subj="workflowGraphPort-error"
          iconType="branch"
          hiddenUntilHover
          forceActive={creatingError}
        />
      )}
      {ports.errorConnected && !ports.errorStepId && <ConnectedErrorPort />}
    </div>
  );
}

/**
 * Non-interactive error port once an on-failure route exists — persistent rest
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
  kind,
  along,
  isHorizontal,
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
  hiddenUntilHover = false,
  forceActive = false,
}: {
  readonly kind: 'step' | 'error';
  readonly along?: string;
  readonly isHorizontal: boolean;
  readonly ariaLabel: string;
  readonly tip: string;
  readonly nodeHovered: boolean;
  readonly fill: string;
  readonly ring: string;
  readonly restFill: string;
  readonly euiThemeContext: ReturnType<typeof useEuiTheme>;
  readonly onActivate: (anchor: WorkflowGraphAnchorRect) => void;
  readonly 'data-test-subj': string;
  readonly iconType: 'plus' | 'branch';
  readonly hiddenUntilHover?: boolean;
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

  const edgeStyle =
    kind === 'error'
      ? errorPortEdgeStyle(PORT_STRADDLE_OUTSET)
      : isHorizontal
      ? {
          right: -PORT_STRADDLE_OUTSET,
          top: along,
          transform: 'translateY(-50%)',
        }
      : {
          left: along,
          bottom: -PORT_STRADDLE_OUTSET,
          transform: 'translateX(-50%)',
        };

  return (
    <EuiToolTip
      ref={tipRef}
      content={tipContent}
      position="top"
      // aria-label already names the action; tooltip adds longer explainer copy.
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
            pointerEvents: 'auto' as const,
            zIndex: 5,
          },
          hiddenUntilHover
            ? {
                opacity: revealed ? 1 : 0,
                pointerEvents: revealed ? ('auto' as const) : ('none' as const),
                [euiCanAnimate]: { transition: 'opacity 150ms ease' },
                '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                '&:focus-within': { opacity: 1, pointerEvents: 'auto' },
              }
            : null,
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
        data-port-kind={kind}
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
            },
            '& .workflowGraphPortPin > span': { opacity: 0 },
            ...(revealed
              ? {
                  '& .workflowGraphPortPin': {
                    width:
                      kind === 'error' && !forceActive ? PORT_DOT_SIZE : PORT_EXPANDED_SIZE,
                    height:
                      kind === 'error' && !forceActive ? PORT_DOT_SIZE : PORT_EXPANDED_SIZE,
                    background: kind === 'error' && !forceActive ? restFill : fill,
                  },
                  '& .workflowGraphPortPin > span': {
                    opacity: kind === 'error' && !forceActive ? 0 : 1,
                  },
                }
              : {}),
            ...(expanded
              ? {
                  '& .workflowGraphPortPin': {
                    width: PORT_EXPANDED_SIZE,
                    height: PORT_EXPANDED_SIZE,
                    background: fill,
                  },
                  '& .workflowGraphPortPin > span': { opacity: 1 },
                }
              : {}),
            '&:hover .workflowGraphPortPin, &:focus-visible .workflowGraphPortPin': {
              width: PORT_EXPANDED_SIZE,
              height: PORT_EXPANDED_SIZE,
              background: fill,
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
            boxShadow: `0 0 0 2px ${ring}`,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: ring,
            flex: '0 0 auto',
            [euiCanAnimate]: {
              transition: `width ${SPRING_MS} ${SPRING}, height ${SPRING_MS} ${SPRING}, background 120ms ease`,
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
