/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { euiCanAnimate, EuiIcon, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { AiIcon } from '@kbn/shared-ux-ai-components';
import { aiIconTileCss } from './ai_icon_tile';
import { CHIP_SIZE } from './node_styles';
import type { RenderStepIcon } from './workflow_graph_actions_context';
import type { getStepIconType } from '../step_icons';

export function NodeStepIcon({
  iconType,
  iconColor,
  renderStepIcon,
  stepType,
  isTrigger,
  useAiGradient,
  fallback,
}: {
  iconType: ReturnType<typeof getStepIconType>;
  iconColor: string | undefined;
  renderStepIcon?: RenderStepIcon;
  stepType: string;
  isTrigger: boolean;
  useAiGradient?: boolean;
  /** Rendered instead of the plain `EuiIcon` when `renderStepIcon` is not provided. */
  fallback?: React.ReactNode;
}) {
  if (useAiGradient && iconType === 'sparkles') {
    return <AiIcon iconType="sparkles" size="m" aria-hidden />;
  }
  if (renderStepIcon) {
    return (
      <div
        css={[
          { color: iconColor, display: 'flex' },
          // Kept deliberately: `renderStepIcon` consumers only tint mask-based
          // icons from `color`; EUI/registered SVG logos ignore it and carry
          // their own fills, which this forces to the category tint.
          iconColor ? { '& svg, & svg *': { fill: iconColor } } : undefined,
        ]}
      >
        {renderStepIcon({ stepType, isTrigger, size: 'm', color: iconColor })}
      </div>
    );
  }
  if (fallback) return <>{fallback}</>;
  return <EuiIcon type={iconType} size="m" color={iconColor} aria-hidden={true} />;
}

export function NodeIconChip({
  background,
  border,
  borderRadius,
  children,
  useAiGradient,
  /** Stretch to the row content height (matches pending draft chip). Fixed square otherwise. */
  fillRow = false,
  size = CHIP_SIZE,
  color,
  'data-test-subj': dataTestSubj,
}: {
  background: string;
  border: string;
  borderRadius: React.CSSProperties['borderRadius'];
  children: React.ReactNode;
  useAiGradient?: boolean;
  fillRow?: boolean;
  /** Side of the fixed square chip (ignored with `fillRow`). */
  size?: number;
  /** Inherited text colour for glyphs that rely on `currentColor`. */
  color?: string;
  'data-test-subj'?: string;
}) {
  const euiThemeContext = useEuiTheme();
  return (
    <div
      data-test-subj={dataTestSubj}
      css={[
        {
          flex: '0 0 auto',
          ...(fillRow
            ? {
                // Same sizing as WorkflowGraphPendingNode: content height under
                // 52px card − padding − border. Hardcoded 32px made the
                // chip jump up 2px when the draft became a committed node.
                alignSelf: 'stretch',
                aspectRatio: '1 / 1',
                width: 'auto',
              }
            : {
                width: size,
                height: size,
              }),
          ...(useAiGradient ? {} : { background, border: `1px solid ${border}` }),
          borderRadius,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          [euiCanAnimate]: { transition: 'background 120ms ease, border-color 120ms ease' },
          ...(color ? { color } : {}),
        },
        useAiGradient ? aiIconTileCss(euiThemeContext) : {},
      ]}
    >
      {children}
    </div>
  );
}
