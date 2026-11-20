/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { euiCanAnimate, euiFocusRing, EuiIcon, EuiToolTip, useEuiTheme } from '@elastic/eui';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { WIRE_CONTROL_SIZE } from './compute_wire_insertion_controls';
import type { WireInsertionControl } from './compute_wire_insertion_controls';
import type {
  WorkflowGraphAnchorRect,
  WorkflowGraphEditActions,
} from './workflow_graph_actions_context';
import { PORT_SPRING_EASE, PORT_SPRING_MS } from './workflow_graph_connection_ports';
import { toAnchorRect } from './workflow_graph_insert_control';

/** Hover strip width across the wire at normal zoom, in flow px (must stay ≥44). */
export const WIRE_HIT_FLOW_PX = 44;
/** Narrowest the hover strip may get on screen, so zooming out never shrinks it to a few px. */
export const WIRE_HIT_MIN_SCREEN_PX = 24;
/** CSS custom property carrying the zoom-aware strip width; the overlay scope sets it once. */
export const WIRE_HIT_VAR = '--workflowGraphWireHit';

const hitSize = `var(${WIRE_HIT_VAR}, ${WIRE_HIT_FLOW_PX}px)`;

/** Strip width across the wire in flow px for a canvas zoom: the flow size, or the screen floor. */
export const wireHitFlowPx = (zoom: number): number =>
  Number.isFinite(zoom) && zoom > 0
    ? Math.max(WIRE_HIT_FLOW_PX, WIRE_HIT_MIN_SCREEN_PX / zoom)
    : WIRE_HIT_FLOW_PX;

export interface WorkflowGraphWireSplitControlProps {
  readonly control: WireInsertionControl;
  readonly edit: WorkflowGraphEditActions;
}

/**
 * Add-step control on a wire or terminal stub.
 * Mid-wire: invisible until hovering (or focusing) the wire segment it owns reveals a ghost
 * circle; it only turns primary when the button itself is hovered or focused.
 * Terminal: persistent circle at the stub tip.
 *
 * Failure / error-path insertion stays on the node edge — not here.
 */
export const WorkflowGraphWireSplitControl = memo(function WorkflowGraphWireSplitControl({
  control,
  edit,
}: WorkflowGraphWireSplitControlProps) {
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const revealed = hovered || focused;
  const isTerminal = control.kind === 'terminal';
  const isHorizontal = control.direction === 'LR';

  const insertStep = useCallback(
    (anchor: WorkflowGraphAnchorRect) => {
      edit.onInsert(control.insertContext, anchor);
    },
    [control, edit]
  );

  // Serialised once per context (hover / focus re-render this component often).
  const insertContextAttr = useMemo(
    () => JSON.stringify(control.insertContext),
    [control.insertContext]
  );

  const addStepLabel = i18n.translate('workflowsUi.graph.wire.addStep', {
    defaultMessage: 'Add step',
  });

  const { segmentStart, segmentEnd, centre } = control;
  const minX = Math.min(segmentStart.x, segmentEnd.x);
  const maxX = Math.max(segmentStart.x, segmentEnd.x);
  const minY = Math.min(segmentStart.y, segmentEnd.y);
  const maxY = Math.max(segmentStart.y, segmentEnd.y);
  // Full-segment hit strip, so hovering anywhere on the owned wire reveals the control. Along the
  // wire it spans the segment (inline, per control); across it it is centred on the wire and as
  // wide as the zoom-aware size the overlay scope provides (css, ≥44 flow px and ≥24 screen px).
  const zoneStyle: React.CSSProperties = isHorizontal
    ? { left: minX, top: minY, width: Math.max(maxX - minX, 1) }
    : { left: minX, top: minY, height: Math.max(maxY - minY, 1) };
  // The button sits on `centre`, whatever its offset from the strip's own midline.
  const buttonStyle: React.CSSProperties = isHorizontal
    ? { left: centre.x - minX, marginTop: centre.y - minY }
    : { top: centre.y - minY, marginLeft: centre.x - minX };

  return (
    <div
      data-test-subj={`workflowGraphWireControl-${control.kind}`}
      data-control-id={control.id}
      data-direction={control.direction}
      data-insert-context={insertContextAttr}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={() => setFocused(false)}
      style={zoneStyle}
      css={{
        position: 'absolute',
        pointerEvents: 'all',
        ...(isHorizontal
          ? { height: hitSize, transform: 'translateY(-50%)' }
          : { width: hitSize, transform: 'translateX(-50%)' }),
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
        style={buttonStyle}
        css={{
          position: 'absolute',
          ...(isHorizontal ? { top: '50%' } : { left: '50%' }),
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
                width: WIRE_CONTROL_SIZE,
                height: WIRE_CONTROL_SIZE,
                borderRadius: '50%',
                border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseProminent}`,
                background: euiTheme.colors.backgroundBasePlain,
                color: euiTheme.colors.textSubdued,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                cursor: 'pointer',
                flex: '0 0 auto',
                boxShadow: 'none',
                [euiCanAnimate]: {
                  transition: `background ${PORT_SPRING_MS} ${PORT_SPRING_EASE}, color ${PORT_SPRING_MS} ${PORT_SPRING_EASE}, border-color ${PORT_SPRING_MS} ${PORT_SPRING_EASE}, box-shadow ${PORT_SPRING_MS} ${PORT_SPRING_EASE}`,
                },
                '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                '&:hover, &:focus-visible': {
                  background: euiTheme.colors.primary,
                  borderColor: euiTheme.colors.primary,
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
});
