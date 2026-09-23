/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { euiCanAnimate, euiFocusRing, EuiIcon, EuiToolTip, useEuiTheme } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { WireInsertionControl } from './compute_wire_insertion_controls';
import { PORT_SPRING_EASE, PORT_SPRING_MS } from './workflow_graph_connection_ports';
import type {
  WorkflowGraphAnchorRect,
  WorkflowGraphEditActions,
} from './workflow_graph_actions_context';
import { toAnchorRect } from './workflow_graph_insert_control';

const CONTROL_SIZE = 22;
/** Hover strip width across the wire (must stay ≥44). */
const HOVER_ZONE = 44;

export interface WorkflowGraphWireSplitControlProps {
  readonly control: WireInsertionControl;
  readonly edit: WorkflowGraphEditActions;
}

/**
 * Add-step control on a wire or terminal stub.
 * Mid-wire: invisible until the segment hover zone / focus reveals it at the
 * midpoint. Terminal: persistent dashed circle at the stub tip.
 *
 * Failure / error-path insertion stays on the node edge — not here.
 */
export function WorkflowGraphWireSplitControl({
  control,
  edit,
}: WorkflowGraphWireSplitControlProps) {
  const { euiTheme } = useEuiTheme();
  const euiThemeContext = useEuiTheme();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const revealed = hovered || focused;
  const isTerminal = control.kind === 'terminal';
  const isHorizontal = control.direction === 'LR';

  const insertStep = useCallback(
    (anchor: WorkflowGraphAnchorRect) => {
      const { stepTarget } = control;
      edit.onInsert(
        {
          mode: 'step',
          index: stepTarget.index,
          path: stepTarget.path,
          sourceNodeId: stepTarget.sourceNodeId,
        },
        anchor
      );
    },
    [control, edit]
  );

  const addStepLabel = i18n.translate('workflowsUi.graph.wire.addStep', {
    defaultMessage: 'Add step',
  });

  const { segmentStart, segmentEnd, centre } = control;
  const minX = Math.min(segmentStart.x, segmentEnd.x);
  const maxX = Math.max(segmentStart.x, segmentEnd.x);
  const minY = Math.min(segmentStart.y, segmentEnd.y);
  const maxY = Math.max(segmentStart.y, segmentEnd.y);
  // Full-segment hit strip (≥44px cross-axis) so hovering anywhere on the
  // arrow reveals the mid-wire control.
  const zoneLeft = isHorizontal ? minX : minX - HOVER_ZONE / 2;
  const zoneTop = isHorizontal ? minY - HOVER_ZONE / 2 : minY;
  const zoneWidth = isHorizontal ? Math.max(maxX - minX, 1) : HOVER_ZONE;
  const zoneHeight = isHorizontal ? HOVER_ZONE : Math.max(maxY - minY, 1);

  const solidAtRest = isTerminal ? false : revealed;

  return (
    <div
      data-test-subj={`workflowGraphWireControl-${control.kind}`}
      data-control-id={control.id}
      data-direction={control.direction}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={() => setFocused(false)}
      css={{
        position: 'absolute',
        left: zoneLeft,
        top: zoneTop,
        width: zoneWidth,
        height: zoneHeight,
        pointerEvents: 'all',
        // Mid-wire stays invisible until hover/focus; terminals stay visible.
        opacity: isTerminal || revealed ? 1 : 0,
        [euiCanAnimate]: {
          transition: `opacity ${PORT_SPRING_MS} ${PORT_SPRING_EASE}`,
        },
        '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
        '&:hover, &:focus-within': { opacity: 1 },
      }}
    >
      <div
        css={{
          position: 'absolute',
          left: centre.x - zoneLeft,
          top: centre.y - zoneTop,
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <EuiToolTip content={addStepLabel} disableScreenReaderOutput>
          <button
            type="button"
            aria-label={addStepLabel}
            data-test-subj="workflowGraphWireAddStep"
            onClick={(e) => insertStep(toAnchorRect(e.currentTarget))}
            css={[
              {
                width: CONTROL_SIZE,
                height: CONTROL_SIZE,
                borderRadius: '50%',
                border: solidAtRest
                  ? `${euiTheme.border.width.thin} solid ${euiTheme.colors.primary}`
                  : `${euiTheme.border.width.thin} dashed ${euiTheme.colors.borderBaseProminent}`,
                background: solidAtRest
                  ? euiTheme.colors.primary
                  : euiTheme.colors.backgroundBasePlain,
                color: solidAtRest
                  ? euiTheme.colors.backgroundBasePlain
                  : euiTheme.colors.textSubdued,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                cursor: 'pointer',
                flex: '0 0 auto',
                boxShadow: solidAtRest
                  ? `0 0 0 2px ${euiTheme.colors.backgroundBasePlain}`
                  : 'none',
                [euiCanAnimate]: {
                  transition: `background ${PORT_SPRING_MS} ${PORT_SPRING_EASE}, color ${PORT_SPRING_MS} ${PORT_SPRING_EASE}, border-color ${PORT_SPRING_MS} ${PORT_SPRING_EASE}, border-style ${PORT_SPRING_MS} ${PORT_SPRING_EASE}, box-shadow ${PORT_SPRING_MS} ${PORT_SPRING_EASE}`,
                },
                '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                '&:hover, &:focus-visible': {
                  background: euiTheme.colors.primary,
                  borderColor: euiTheme.colors.primary,
                  borderStyle: 'solid',
                  color: euiTheme.colors.backgroundBasePlain,
                  boxShadow: `0 0 0 2px ${euiTheme.colors.backgroundBasePlain}`,
                },
              },
              { '&:focus-visible': euiFocusRing(euiThemeContext) },
            ]}
          >
            <EuiIcon type="plus" size="s" aria-hidden />
          </button>
        </EuiToolTip>
      </div>
    </div>
  );
}
