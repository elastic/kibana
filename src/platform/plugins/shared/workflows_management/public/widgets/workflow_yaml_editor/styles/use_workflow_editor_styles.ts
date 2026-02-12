/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import { transparentize } from '@elastic/eui';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';

export const EXECUTION_YAML_SNAPSHOT_CLASS = 'execution-yaml-snapshot';

/**
 * Hook that provides memoized CSS styles for the workflow YAML editor component
 */
export const useWorkflowEditorStyles = () => {
  return useMemoCss({
    actionsMenuPopoverPanel: css({
      minInlineSize: '600px',
    }),

    container: ({ euiTheme }: UseEuiTheme) =>
      css({
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        minHeight: 0,

        // Template variables decorations
        '.template-variable-valid': {
          backgroundColor: transparentize(euiTheme.colors.primary, 0.12),
          borderRadius: '2px',
        },
        '.template-variable-error': {
          backgroundColor: transparentize(euiTheme.colors.vis.euiColorVisWarning1, 0.24),
          color: euiTheme.colors.severity.danger,
          borderRadius: '2px',
        },
        '.template-variable-warning': {
          backgroundColor: transparentize(euiTheme.colors.vis.euiColorVisWarning1, 0.24),
          borderRadius: '2px',
        },

        // After text (shadow) decorations
        '.after-text': {
          marginLeft: '10px',
          color: euiTheme.colors.textDisabled,
        },
        '.after-text + .after-text': {
          marginLeft: '0', // Remove padding for consecutive after-text spans
        },

        // Connector name badge (before decoration)
        '.connector-name-badge': {
          display: 'inline-block',
          backgroundColor: transparentize(euiTheme.colors.success, 0.1),
          color: euiTheme.colors.successText,
          padding: '2px 6px',
          borderRadius: '4px',
          marginRight: '8px',
          fontSize: '12px',
          fontWeight: 500,
          lineHeight: '1.4',
        },

        // Step highlighting decorations
        '.step-highlight': {
          backgroundColor: euiTheme.colors.backgroundBaseAccent,
          borderRadius: '2px',
        },
        '.dimmed': {
          opacity: 0.5,
        },

        // Alert trigger styling
        '.alert-trigger-glyph': {
          '&:before': {
            content: '""',
            display: 'block',
            width: '12px',
            height: '12px',
            backgroundColor: euiTheme.colors.warning,
            borderRadius: '50%',
          },
        },
        '.alert-trigger-highlight': {
          backgroundColor: euiTheme.colors.backgroundLightWarning,
        },

        // Error highlighting
        '.duplicate-step-name-error': {
          backgroundColor: euiTheme.colors.backgroundLightDanger,
        },
        '.duplicate-step-name-error-margin': {
          backgroundColor: euiTheme.colors.backgroundLightDanger,
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: euiTheme.colors.backgroundLightDanger,
            zIndex: 1000,
          },
          color: 'transparent',
          textShadow: 'none',
          fontSize: 0,
        },

        // Step execution styling
        '.elasticsearch-step-glyph': {
          '&:before': {
            content: '""',
            display: 'block',
            width: '12px',
            height: '12px',
            backgroundColor: euiTheme.colors.vis.euiColorVis1,
            borderRadius: '50%',
          },
        },
        '.elasticsearch-step-type-highlight': {
          backgroundColor: 'rgba(0, 120, 212, 0.1)',
          borderLeft: `2px solid ${euiTheme.colors.vis.euiColorVis1}`,
        },
        '.elasticsearch-step-block-highlight': {
          backgroundColor: 'rgba(0, 120, 212, 0.08)',
          borderLeft: `2px solid ${euiTheme.colors.vis.euiColorVis1}`,
        },
        '.elasticsearch-step-background': {
          backgroundColor: 'rgba(0, 120, 212, 0.08)',
          borderLeft: `2px solid ${euiTheme.colors.vis.euiColorVis1}`,
        },
        '.workflow-step-highlight': {
          backgroundColor: 'rgba(0, 120, 212, 0.1)',
          borderLeft: `3px solid ${euiTheme.colors.vis.euiColorVis1}`,
        },
        '.workflow-step-line-highlight': {
          backgroundColor: 'rgba(0, 120, 212, 0.05)',
          borderLeft: `2px solid ${euiTheme.colors.vis.euiColorVis1}`,
        },

        // Diff highlighting styles
        '.changed-line-highlight': {
          backgroundColor: euiTheme.colors.backgroundLightWarning,
          borderLeft: `2px solid ${euiTheme.colors.warning}`,
          opacity: 0.7,
        },
        '.changed-line-margin': {
          backgroundColor: euiTheme.colors.warning,
          width: '2px',
          opacity: 0.7,
        },
      }),

    editorContainer: ({ euiTheme }: UseEuiTheme) =>
      css({
        flex: '1 1 0',
        minWidth: 0,
        overflowY: 'auto',
        minHeight: 0,
        backgroundColor: euiTheme.colors.backgroundBaseSubdued,
        [`&.${EXECUTION_YAML_SNAPSHOT_CLASS}`]: {
          backgroundColor: euiTheme.colors.backgroundBasePlain,
        },
      }),

    validationErrorsContainer: css({
      flexShrink: 0,
      overflow: 'hidden',
      zIndex: 2, // to overlay the editor flying action buttons
    }),

    stepActionsContainer: css({
      position: 'absolute',
      zIndex: 1002, // Above the highlighting and pseudo-element
      transform: 'translateY(4px) translateX(-28px)', // 24px to match width + 4px padding inside decoration
    }),

    downloadSchemaButton: ({ euiTheme }: UseEuiTheme) =>
      css({
        color: euiTheme.colors.textSubdued,
        '&:hover': {
          color: euiTheme.colors.textPrimary,
        },
        '&:hover:not(:disabled)::before': {
          backgroundColor: 'transparent',
        },
      }),
  });
};
