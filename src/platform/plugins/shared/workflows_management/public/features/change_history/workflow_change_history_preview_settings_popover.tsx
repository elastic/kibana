/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiCheckbox,
  EuiHorizontalRule,
  EuiPopover,
  EuiText,
  EuiToolTip,
  transparentize,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { ClassNames, css } from '@emotion/react';
import React, { useCallback, useRef, useState } from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import { changeHistoryPreviewTypography } from './change_history_preview_typography';

export type WorkflowChangeHistoryCompareMode = 'unified' | 'split';

const COMPARE_MODES: WorkflowChangeHistoryCompareMode[] = ['unified', 'split'];

const COMPARE_TILE_WIDTH = 110;
const COMPARE_TILE_HEIGHT = 100;
const COMPARE_TILE_ILLUSTRATION_HEIGHT = 58;
const COMPARE_TILE_FOOTER_HEIGHT = COMPARE_TILE_HEIGHT - COMPARE_TILE_ILLUSTRATION_HEIGHT - 1;

const PANEL_HEADER_PADDING = 12;
const PANEL_SECTION_PADDING = 16;
const SECTION_LABEL_GAP = 8;
const TILE_GAP = 16;
const TILE_FOOTER_PADDING_X = 10;
const SELECTED_TILE_TINT_ALPHA = 0.04;

const ADDED_BAR_COLOR = '#16c5c0';
const REMOVED_BAR_COLOR = '#f6726a';

const ILLUSTRATION_BAR_HEIGHT = 8;
const ILLUSTRATION_BAR_GROUP_HEIGHT = 36;
const ILLUSTRATION_BAR_TOP = (COMPARE_TILE_ILLUSTRATION_HEIGHT - ILLUSTRATION_BAR_GROUP_HEIGHT) / 2;
const ILLUSTRATION_BAR_ROW_OFFSETS = [0, 14, 28] as const;

interface CompareModeIllustrationProps {
  mode: WorkflowChangeHistoryCompareMode;
  borderColor: string;
}

const CompareModeIllustration = ({
  mode,
  borderColor,
}: CompareModeIllustrationProps): JSX.Element => {
  const barY = (rowIndex: number): number =>
    ILLUSTRATION_BAR_TOP + ILLUSTRATION_BAR_ROW_OFFSETS[rowIndex];

  if (mode === 'unified') {
    return (
      <svg
        width="80"
        height={COMPARE_TILE_ILLUSTRATION_HEIGHT}
        viewBox={`0 0 80 ${COMPARE_TILE_ILLUSTRATION_HEIGHT}`}
        aria-hidden={true}
        data-test-subj={`workflowChangeHistoryCompareIllustration-${mode}`}
      >
        <rect
          x="0"
          y={barY(0)}
          width="80"
          height={ILLUSTRATION_BAR_HEIGHT}
          rx="4"
          fill={ADDED_BAR_COLOR}
        />
        <rect
          x="0"
          y={barY(1)}
          width="60"
          height={ILLUSTRATION_BAR_HEIGHT}
          rx="4"
          fill={ADDED_BAR_COLOR}
        />
        <rect
          x="0"
          y={barY(2)}
          width="80"
          height={ILLUSTRATION_BAR_HEIGHT}
          rx="4"
          fill={REMOVED_BAR_COLOR}
        />
      </svg>
    );
  }

  return (
    <svg
      width="86"
      height={COMPARE_TILE_ILLUSTRATION_HEIGHT}
      viewBox={`0 0 86 ${COMPARE_TILE_ILLUSTRATION_HEIGHT}`}
      aria-hidden={true}
      data-test-subj={`workflowChangeHistoryCompareIllustration-${mode}`}
    >
      <line
        x1="43"
        y1="0"
        x2="43"
        y2={COMPARE_TILE_ILLUSTRATION_HEIGHT}
        stroke={borderColor}
        strokeWidth="1"
      />
      <rect
        x="0"
        y={barY(0)}
        width="33"
        height={ILLUSTRATION_BAR_HEIGHT}
        rx="4"
        fill={ADDED_BAR_COLOR}
      />
      <rect
        x="53"
        y={barY(0)}
        width="32"
        height={ILLUSTRATION_BAR_HEIGHT}
        rx="4"
        fill={REMOVED_BAR_COLOR}
      />
      <rect
        x="0"
        y={barY(1)}
        width="33"
        height={ILLUSTRATION_BAR_HEIGHT}
        rx="4"
        fill={ADDED_BAR_COLOR}
      />
      <rect
        x="53"
        y={barY(1)}
        width="32"
        height={ILLUSTRATION_BAR_HEIGHT}
        rx="4"
        fill={REMOVED_BAR_COLOR}
      />
      <rect
        x="0"
        y={barY(2)}
        width="26"
        height={ILLUSTRATION_BAR_HEIGHT}
        rx="4"
        fill={ADDED_BAR_COLOR}
      />
      <rect
        x="53"
        y={barY(2)}
        width="26"
        height={ILLUSTRATION_BAR_HEIGHT}
        rx="4"
        fill={REMOVED_BAR_COLOR}
      />
    </svg>
  );
};

export interface WorkflowChangeHistoryPreviewSettingsPopoverProps {
  hasCompare: boolean;
  compareMode: WorkflowChangeHistoryCompareMode;
  onCompareModeChange: (compareMode: WorkflowChangeHistoryCompareMode) => void;
  highlightValidationErrors: boolean;
  onHighlightValidationErrorsChange: (highlightValidationErrors: boolean) => void;
}

export const WorkflowChangeHistoryPreviewSettingsPopover = ({
  hasCompare,
  compareMode,
  onCompareModeChange,
  highlightValidationErrors,
  onHighlightValidationErrorsChange,
}: WorkflowChangeHistoryPreviewSettingsPopoverProps): JSX.Element => {
  const { euiTheme } = useEuiTheme();
  const styles = useMemoCss(componentStyles);
  const [isOpen, setIsOpen] = useState(false);
  const unifiedTileRef = useRef<HTMLButtonElement>(null);
  const splitTileRef = useRef<HTMLButtonElement>(null);

  const popoverTitleId = useGeneratedHtmlId({
    prefix: 'workflowChangeHistoryPreviewSettingsTitle',
  });
  const highlightValidationId = useGeneratedHtmlId({
    prefix: 'workflowChangeHistoryHighlightValidation',
  });
  const compareModeGroupLabelId = useGeneratedHtmlId({
    prefix: 'workflowChangeHistoryCompareModeGroup',
  });

  const settingsLabel = i18n.translate(
    'xpack.workflowsManagement.changeHistory.preview.settings.label',
    { defaultMessage: 'YAML editor settings' }
  );

  const codeComparingLabel = i18n.translate(
    'xpack.workflowsManagement.changeHistory.preview.settings.codeComparing',
    { defaultMessage: 'Code comparing' }
  );

  const unifiedLabel = i18n.translate(
    'xpack.workflowsManagement.changeHistory.preview.settings.unified',
    { defaultMessage: 'Unified' }
  );

  const splitLabel = i18n.translate(
    'xpack.workflowsManagement.changeHistory.preview.settings.split',
    { defaultMessage: 'Split' }
  );

  const focusCompareTile = useCallback((mode: WorkflowChangeHistoryCompareMode): void => {
    (mode === 'unified' ? unifiedTileRef : splitTileRef).current?.focus();
  }, []);

  const selectCompareMode = useCallback(
    (mode: WorkflowChangeHistoryCompareMode, shouldFocus = false): void => {
      onCompareModeChange(mode);
      if (shouldFocus) {
        focusCompareTile(mode);
      }
    },
    [focusCompareTile, onCompareModeChange]
  );

  const handleCompareTileKeyDown = useCallback(
    (
      event: React.KeyboardEvent<HTMLButtonElement>,
      mode: WorkflowChangeHistoryCompareMode
    ): void => {
      const currentIndex = COMPARE_MODES.indexOf(compareMode);

      switch (event.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault();
          selectCompareMode(COMPARE_MODES[Math.max(0, currentIndex - 1)], true);
          return;
        case 'ArrowRight':
        case 'ArrowDown':
          event.preventDefault();
          selectCompareMode(
            COMPARE_MODES[Math.min(COMPARE_MODES.length - 1, currentIndex + 1)],
            true
          );
          return;
        case 'Home':
          event.preventDefault();
          selectCompareMode('unified', true);
          return;
        case 'End':
          event.preventDefault();
          selectCompareMode('split', true);
          return;
        case ' ':
        case 'Enter':
          event.preventDefault();
          selectCompareMode(mode, true);
      }
    },
    [compareMode, selectCompareMode]
  );

  const renderCompareTile = (
    mode: WorkflowChangeHistoryCompareMode,
    label: string,
    testSubj: string,
    tileRef: React.RefObject<HTMLButtonElement>
  ): JSX.Element => {
    const isSelected = compareMode === mode;

    return (
      <ClassNames>
        {({ css: cssClassName }) => (
          <button
            ref={tileRef}
            type="button"
            role="radio"
            aria-checked={isSelected}
            tabIndex={isSelected ? 0 : -1}
            className={cssClassName(styles.compareTile, isSelected && styles.compareTileSelected)}
            data-test-subj={testSubj}
            aria-label={label}
            onClick={() => selectCompareMode(mode)}
            onKeyDown={(event: React.KeyboardEvent<HTMLButtonElement>) =>
              handleCompareTileKeyDown(event, mode)
            }
          >
            {isSelected ? (
              <EuiText
                component="span"
                css={styles.compareTileSelectedOverlay}
                aria-hidden={true}
              />
            ) : null}
            <EuiText component="span" css={styles.compareTileIllustration} aria-hidden={true}>
              <CompareModeIllustration mode={mode} borderColor={euiTheme.colors.borderBasePlain} />
            </EuiText>
            <EuiText component="span" css={styles.compareTileDivider} aria-hidden={true} />
            <EuiText component="span" css={styles.compareTileFooter}>
              <EuiText
                component="span"
                css={[styles.radioCircle, isSelected && styles.radioCircleSelected]}
                aria-hidden={true}
              />
              <EuiText component="span" css={styles.compareTileLabel}>
                {label}
              </EuiText>
            </EuiText>
          </button>
        )}
      </ClassNames>
    );
  };

  return (
    <EuiPopover
      data-test-subj="workflowChangeHistoryPreviewSettingsPopover"
      aria-labelledby={popoverTitleId}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="upRight"
      panelPaddingSize="none"
      panelStyle={{ width: 'auto' }}
      button={
        <EuiToolTip content={settingsLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            size="s"
            iconType="controlsHorizontal"
            color="primary"
            data-test-subj="workflowChangeHistoryPreviewSettingsButton"
            onClick={() => setIsOpen((open) => !open)}
            aria-label={settingsLabel}
          />
        </EuiToolTip>
      }
    >
      <EuiText component="div" css={styles.panel}>
        <EuiText component="div" css={styles.header}>
          <EuiText component="span" id={popoverTitleId} css={styles.title}>
            {settingsLabel}
          </EuiText>
        </EuiText>

        <EuiHorizontalRule margin="none" />

        {hasCompare ? (
          <EuiText component="div" css={styles.compareSection}>
            <EuiText component="span" css={styles.sectionLabel} id={compareModeGroupLabelId}>
              {codeComparingLabel}
            </EuiText>

            <EuiText
              component="div"
              css={styles.compareTileGroup}
              role="radiogroup"
              aria-labelledby={compareModeGroupLabelId}
            >
              {renderCompareTile(
                'unified',
                unifiedLabel,
                'workflowChangeHistoryCompareUnified',
                unifiedTileRef
              )}
              {renderCompareTile(
                'split',
                splitLabel,
                'workflowChangeHistoryCompareSplit',
                splitTileRef
              )}
            </EuiText>
          </EuiText>
        ) : null}

        <EuiText component="div" css={styles.checkboxSection}>
          <EuiCheckbox
            id={highlightValidationId}
            data-test-subj="workflowChangeHistoryHighlightValidationErrors"
            label={i18n.translate(
              'xpack.workflowsManagement.changeHistory.preview.settings.highlightValidationErrors',
              { defaultMessage: 'Highlight the validation errors' }
            )}
            checked={highlightValidationErrors}
            onChange={(event) => onHighlightValidationErrorsChange(event.target.checked)}
          />
        </EuiText>
      </EuiText>
    </EuiPopover>
  );
};

const componentStyles = {
  panel: ({ euiTheme }: UseEuiTheme) =>
    css(changeHistoryPreviewTypography, {
      width: 'fit-content',
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      borderRadius: euiTheme.border.radius.medium,
      overflow: 'hidden',
    }),
  header: css({
    padding: `${PANEL_HEADER_PADDING}px`,
  }),
  title: css`
    ${changeHistoryPreviewTypography}
    margin: 0;
    font-weight: var(--Font-weight-Semi-bold, 600);
    font-size: 14px;
    line-height: 20px;
  `,
  compareSection: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'flex',
      flexDirection: 'column',
      gap: `${SECTION_LABEL_GAP}px`,
      padding: `${PANEL_SECTION_PADDING}px`,
      borderBottom: euiTheme.border.thin,
    }),
  sectionLabel: css({
    fontWeight: 400,
    fontSize: '14px',
    lineHeight: '20px',
    color: 'inherit',
  }),
  compareTileGroup: css({
    display: 'grid',
    gridTemplateColumns: `repeat(2, ${COMPARE_TILE_WIDTH}px)`,
    gap: `${TILE_GAP}px`,
    width: 'fit-content',
  }),
  compareTile: ({ euiTheme }: UseEuiTheme) =>
    css({
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      width: `${COMPARE_TILE_WIDTH}px`,
      height: `${COMPARE_TILE_HEIGHT}px`,
      minWidth: `${COMPARE_TILE_WIDTH}px`,
      maxWidth: `${COMPARE_TILE_WIDTH}px`,
      padding: 0,
      border: euiTheme.border.thin,
      borderRadius: '8px',
      overflow: 'hidden',
      cursor: 'pointer',
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      textAlign: 'left',
      appearance: 'none',
      font: 'inherit',
      color: 'inherit',

      '&:focus-visible': {
        outline: `${euiTheme.focus.width} solid ${euiTheme.focus.color}`,
        outlineOffset: 0,
      },
    }),
  compareTileSelected: ({ euiTheme }: UseEuiTheme) =>
    css({
      borderColor: euiTheme.colors.borderBasePrimary,
    }),
  compareTileSelectedOverlay: ({ euiTheme }: UseEuiTheme) =>
    css({
      position: 'absolute',
      inset: 0,
      zIndex: 0,
      borderRadius: '7px',
      backgroundColor: transparentize(euiTheme.colors.primary, SELECTED_TILE_TINT_ALPHA),
      pointerEvents: 'none',
    }),
  compareTileIllustration: css({
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: `0 0 ${COMPARE_TILE_ILLUSTRATION_HEIGHT}px`,
    width: '100%',
    height: `${COMPARE_TILE_ILLUSTRATION_HEIGHT}px`,
    overflow: 'hidden',

    svg: {
      display: 'block',
      flexShrink: 0,
    },
  }),
  compareTileDivider: ({ euiTheme }: UseEuiTheme) =>
    css({
      position: 'relative',
      zIndex: 1,
      flexShrink: 0,
      height: '1px',
      width: '100%',
      backgroundColor: euiTheme.colors.borderBasePlain,
    }),
  compareTileFooter: css({
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flex: `0 0 ${COMPARE_TILE_FOOTER_HEIGHT}px`,
    alignItems: 'center',
    gap: '6px',
    width: '100%',
    height: `${COMPARE_TILE_FOOTER_HEIGHT}px`,
    padding: `0 ${TILE_FOOTER_PADDING_X}px`,
    boxSizing: 'border-box',
  }),
  radioCircle: ({ euiTheme }: UseEuiTheme) =>
    css({
      width: '16px',
      height: '16px',
      flexShrink: 0,
      borderRadius: '50%',
      border: `1px solid ${euiTheme.colors.borderBasePlain}`,
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      boxSizing: 'border-box',
    }),
  radioCircleSelected: ({ euiTheme }: UseEuiTheme) =>
    css({
      borderColor: euiTheme.colors.primary,
      backgroundColor: euiTheme.colors.primary,
      boxShadow: `inset 0 0 0 3px ${euiTheme.colors.backgroundBasePlain}`,
    }),
  compareTileLabel: ({ euiTheme }: UseEuiTheme) =>
    css({
      fontWeight: euiTheme.font.weight.bold,
      fontSize: '14px',
      lineHeight: '20px',
      color: euiTheme.colors.textParagraph,
    }),
  checkboxSection: css({
    padding: `${PANEL_SECTION_PADDING}px`,
  }),
};
