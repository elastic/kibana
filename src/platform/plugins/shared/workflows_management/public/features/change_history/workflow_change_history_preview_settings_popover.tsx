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
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPopover,
  EuiPopoverTitle,
  EuiText,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useRef, useState } from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import { changeHistoryPreviewTypography } from './change_history_preview_typography';

export type WorkflowChangeHistoryCompareMode = 'unified' | 'split';

const COMPARE_MODES: WorkflowChangeHistoryCompareMode[] = ['unified', 'split'];

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
      <EuiButtonEmpty
        buttonRef={tileRef}
        role="radio"
        aria-checked={isSelected}
        tabIndex={isSelected ? 0 : -1}
        flush="both"
        color="text"
        css={[styles.compareTile, isSelected && styles.compareTileSelected]}
        data-test-subj={testSubj}
        aria-label={label}
        onClick={() => selectCompareMode(mode)}
        onKeyDown={(event: React.KeyboardEvent<HTMLButtonElement>) =>
          handleCompareTileKeyDown(event, mode)
        }
      >
        <EuiFlexGroup
          direction="column"
          gutterSize="s"
          responsive={false}
          css={styles.compareTileBody}
        >
          <EuiFlexItem grow={false}>
            <EuiFlexGroup
              alignItems="center"
              justifyContent="center"
              gutterSize="none"
              responsive={false}
              css={styles.illustrationFrame}
              aria-hidden={true}
            >
              {mode === 'unified' ? (
                <EuiFlexGroup
                  direction="column"
                  gutterSize="xs"
                  responsive={false}
                  css={styles.unifiedIllustration}
                >
                  <EuiText component="span" css={styles.illustrationBarAdded} />
                  <EuiText component="span" css={styles.illustrationBarAdded} />
                  <EuiText component="span" css={styles.illustrationBarRemoved} />
                </EuiFlexGroup>
              ) : (
                <EuiFlexGroup gutterSize="none" responsive={false} css={styles.splitIllustration}>
                  <EuiText component="span" css={styles.illustrationBarAdded} />
                  <EuiText component="span" css={styles.illustrationBarRemoved} />
                  <EuiText component="span" css={styles.illustrationBarAdded} />
                  <EuiText component="span" css={styles.illustrationBarRemoved} />
                  <EuiText component="span" css={styles.illustrationBarAdded} />
                  <EuiText component="span" css={styles.illustrationBarRemoved} />
                </EuiFlexGroup>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiText component="span" css={styles.tileDivider} aria-hidden={true} />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiFlexGroup
              alignItems="center"
              gutterSize="s"
              responsive={false}
              css={[styles.tileFooter, isSelected && styles.tileFooterSelected]}
            >
              <EuiText
                component="span"
                css={[styles.radioCircle, isSelected && styles.radioCircleSelected]}
                aria-hidden={true}
              />
              <EuiText component="span" css={styles.compareTileLabel}>
                {label}
              </EuiText>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiButtonEmpty>
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
      <EuiPopoverTitle id={popoverTitleId} paddingSize="m">
        <EuiText component="span" css={styles.title}>
          {settingsLabel}
        </EuiText>
      </EuiPopoverTitle>

      <EuiFlexGroup direction="column" gutterSize="m" responsive={false} css={styles.panelBody}>
        {hasCompare ? (
          <>
            <EuiText component="span" css={styles.sectionLabel} id={compareModeGroupLabelId}>
              {codeComparingLabel}
            </EuiText>

            <EuiFlexGroup
              gutterSize="s"
              responsive={false}
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
            </EuiFlexGroup>

            <EuiHorizontalRule margin="none" />
          </>
        ) : null}

        <EuiFlexGroup gutterSize="none" responsive={false} css={styles.checkboxRow}>
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
        </EuiFlexGroup>
      </EuiFlexGroup>
    </EuiPopover>
  );
};

const componentStyles = {
  title: css`
    ${changeHistoryPreviewTypography}
    font-weight: var(--Font-weight-Semi-bold, 600);
  `,
  panelBody: ({ euiTheme }: UseEuiTheme) =>
    css(changeHistoryPreviewTypography, {
      display: 'flex',
      flexDirection: 'column',
      gap: euiTheme.size.m,
      padding: euiTheme.size.m,
      minWidth: '360px',
    }),
  sectionLabel: css({
    fontWeight: 400,
    color: 'inherit',
  }),
  compareTileGroup: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: euiTheme.size.s,
    }),
  compareTile: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'flex',
      flexDirection: 'column',
      minHeight: '132px',
      padding: 0,
      border: euiTheme.border.thin,
      borderRadius: euiTheme.border.radius.medium,
      overflow: 'hidden',
      cursor: 'pointer',
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      textAlign: 'left',

      '&:focus-visible': {
        outline: `${euiTheme.focus.width} solid ${euiTheme.focus.color}`,
        outlineOffset: euiTheme.focus.width,
      },
    }),
  compareTileSelected: ({ euiTheme }: UseEuiTheme) =>
    css({
      borderColor: euiTheme.colors.borderBasePrimary,
      boxShadow: `inset 0 0 0 1px ${euiTheme.colors.borderBasePrimary}`,
    }),
  compareTileBody: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'flex',
      flex: '1 1 auto',
      flexDirection: 'column',
      minHeight: 0,
      padding: euiTheme.size.s,
      gap: euiTheme.size.s,
    }),
  radioCircle: ({ euiTheme }: UseEuiTheme) =>
    css({
      width: '16px',
      height: '16px',
      flexShrink: 0,
      borderRadius: '50%',
      border: `2px solid ${euiTheme.colors.borderBasePlain}`,
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      boxSizing: 'border-box',
    }),
  radioCircleSelected: ({ euiTheme }: UseEuiTheme) =>
    css({
      borderColor: euiTheme.colors.primary,
      backgroundColor: euiTheme.colors.primary,
      boxShadow: `inset 0 0 0 3px ${euiTheme.colors.backgroundBasePlain}`,
    }),
  illustrationFrame: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '64px',
      minHeight: '64px',
      padding: euiTheme.size.s,
      borderRadius: euiTheme.border.radius.small,
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
    }),
  tileDivider: ({ euiTheme }: UseEuiTheme) =>
    css({
      height: '1px',
      margin: 0,
      backgroundColor: euiTheme.colors.borderBaseSubdued,
    }),
  tileFooter: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'flex',
      alignItems: 'center',
      gap: euiTheme.size.s,
      minHeight: '32px',
      padding: `${euiTheme.size.xs} ${euiTheme.size.s}`,
      borderRadius: euiTheme.border.radius.small,
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
    }),
  tileFooterSelected: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundLightPrimary,
    }),
  unifiedIllustration: css({
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    width: '72px',
  }),
  splitIllustration: css({
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    columnGap: '6px',
    rowGap: '4px',
    width: '88px',
    alignItems: 'center',
  }),
  illustrationBarAdded: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'block',
      height: '6px',
      borderRadius: '2px',
      backgroundColor: euiTheme.colors.vis.euiColorVisSuccess0,
    }),
  illustrationBarRemoved: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'block',
      height: '6px',
      borderRadius: '2px',
      backgroundColor: euiTheme.colors.vis.euiColorVisDanger0,
    }),
  compareTileLabel: css`
    font-weight: var(--Font-weight-Semi-bold, 600);
  `,
  checkboxRow: ({ euiTheme }: UseEuiTheme) =>
    css({
      paddingTop: euiTheme.size.xs,
    }),
};
