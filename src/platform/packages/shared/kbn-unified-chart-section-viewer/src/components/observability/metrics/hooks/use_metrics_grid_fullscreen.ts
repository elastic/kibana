/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { logicalCSS, useEuiTheme, useGeneratedHtmlId } from '@elastic/eui';
import { css } from '@emotion/css';
import {
  METRICS_GRID_FULL_SCREEN_CLASS,
  METRICS_GRID_RESTRICT_BODY_CLASS,
} from '../../../../common/constants';

export const FULLSCREEN_BODY_STYLES_CLASS = css`
  *:not(
      .euiFlyout,
      .${METRICS_GRID_FULL_SCREEN_CLASS}, .${METRICS_GRID_FULL_SCREEN_CLASS} *,
      [data-euiportal='true'],
      [data-euiportal='true'] *
    ) {
    z-index: unset;
  }
`;

export const useMetricsGridFullScreen = ({ prefix }: { prefix: string }) => {
  const { euiTheme } = useEuiTheme();
  const metricsGridId = useGeneratedHtmlId({ prefix });

  const styles = useMemo(() => {
    const fullScreenZIndex = Number(euiTheme.levels.header) - 1;
    const menuZIndex = Number(euiTheme.levels.menu);
    return {
      [METRICS_GRID_FULL_SCREEN_CLASS]: css`
        z-index: ${fullScreenZIndex} !important;
        position: fixed;
        inset: 0;
        ${logicalCSS('right', 'var(--euiPushFlyoutOffsetInlineEnd, 0px)')}
        background-color: ${euiTheme.colors.backgroundBasePlain};

        // Embeddable panels set high z-index values that can stack above the
        // fullscreen overlay and interfere with flyouts. Reset to auto so they
        // participate in normal stacking context.
        // See https://github.com/elastic/kibana/issues/260087
        .embPanel {
          z-index: auto !important;
        }

        .embPanel__hoverActions {
          z-index: ${Number(euiTheme.levels.flyout) - 2} !important;
        }
      `,
      [METRICS_GRID_RESTRICT_BODY_CLASS]: css`
        overflow: hidden;
        --euiFixedHeadersOffset: 0px !important;

        .euiHeader[data-fixed-header] {
          z-index: ${fullScreenZIndex - 1} !important;
        }

        .euiOverlayMask[data-relative-to-header='below'] {
          ${logicalCSS('top', '0')}
        }

        .euiFlyout {
          ${logicalCSS('top', '0 !important')}
          ${logicalCSS('bottom', '0 !important')}
          ${logicalCSS('height', '100% !important')}
          ${logicalCSS('max-height', '100vh !important')}
          z-index: ${menuZIndex + 1} !important;
        }

        [id^='echTooltipPortalMainTooltip'] {
          z-index: ${menuZIndex} !important;
        }
      `,
    };
  }, [euiTheme]);

  return { metricsGridId, styles };
};
