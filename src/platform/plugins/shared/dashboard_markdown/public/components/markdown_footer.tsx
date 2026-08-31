/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { css } from '@emotion/react';
import type { UseEuiTheme } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  euiCanAnimate,
  htmlIdGenerator,
} from '@elastic/eui';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';

export const FOOTER_HELP_TEXT = htmlIdGenerator()('markdownEditorFooterHelp');

// Container query for when the height is too short and we need to switch to a more compact layout
export const SHORT_CONTAINER_QUERY = `@container (max-height: 119px)`;

const footerStyles = {
  footer: ({ euiTheme }: UseEuiTheme) =>
    css({
      borderRadius: `0 0 ${euiTheme.size.s} ${euiTheme.size.s}`,
      width: '100%',
      borderTop: `1px solid ${euiTheme.colors.borderBasePlain}`,
      position: 'absolute',
      bottom: 0,
      '&::before': {
        content: "''",
        position: 'absolute',
        background: euiTheme.colors.backgroundBasePlain,
        opacity: 0.9,
        inset: 0,
      },
      [SHORT_CONTAINER_QUERY]: {
        borderTop: 'none',
        right: 0,
        width: 'auto',
        zIndex: 1,
        '&::before': {
          background: 'none',
        },
      },
    }),
  buttonsContainer: ({ euiTheme }: UseEuiTheme) =>
    css({
      margin: euiTheme.size.s,
      position: 'relative',
    }),
  previewFooter: ({ euiTheme }: UseEuiTheme) =>
    css({
      opacity: 0,
      transition: `${euiCanAnimate ? `opacity ${euiTheme.animation.slow} ease-in` : undefined}`,
      '.dshDashboardGrid__item:hover &': {
        opacity: 1,
      },
    }),
};

const strings = {
  discardButton: i18n.translate('dashboardMarkdown.discardButton', {
    defaultMessage: 'Discard',
  }),
  applyButton: i18n.translate('dashboardMarkdown.applyButton', {
    defaultMessage: 'Apply',
  }),
  applyButtonDisabledTooltip: i18n.translate('dashboardMarkdown.applyButtonDisabledTooltip', {
    defaultMessage: 'No changes to save',
  }),
  markdownFooterHelpText: i18n.translate('dashboardMarkdown.footerHelpText', {
    defaultMessage: 'Press Apply to save your changes or Discard to cancel.',
  }),
};

export interface MarkdownFooterProps {
  onCancel: () => void;
  onSave: () => Promise<void>;
  isPreview?: boolean;
  cancelButtonRef: React.RefObject<HTMLButtonElement>;
  isSaveable?: boolean;
  cancelButtonLabel?: string;
  saveButtonLabel?: string;
  saveDisabledTooltip?: string;
  helpText?: string;
  onPreview?: () => void;
  isPreviewable?: boolean;
  previewButtonLabel?: string;
}

export const MarkdownFooter = ({
  onCancel,
  onSave,
  isPreview,
  cancelButtonRef,
  isSaveable,
  cancelButtonLabel = strings.discardButton,
  saveButtonLabel = strings.applyButton,
  saveDisabledTooltip = strings.applyButtonDisabledTooltip,
  helpText = strings.markdownFooterHelpText,
  onPreview,
  isPreviewable,
  previewButtonLabel,
}: MarkdownFooterProps) => {
  const [saveInProgress, setSaveInProgress] = React.useState(false);
  const styles = useMemoCss(footerStyles);

  const handleSave = useCallback(async () => {
    setSaveInProgress(true);
    try {
      await onSave();
    } finally {
      setSaveInProgress(false);
    }
  }, [onSave]);
  return (
    <div css={[styles.footer, isPreview && styles.previewFooter]}>
      {/* Hidden descriptive text for screen readers */}
      <p id={FOOTER_HELP_TEXT} hidden>
        {helpText}
      </p>
      <EuiFlexGroup
        responsive={false}
        gutterSize="xs"
        justifyContent="flexEnd"
        css={styles.buttonsContainer}
      >
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj="markdownEditorDiscardButton"
            color="primary"
            size="s"
            onClick={onCancel}
            buttonRef={cancelButtonRef}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Escape') {
                onCancel();
              }
            }}
          >
            {cancelButtonLabel}
          </EuiButtonEmpty>
        </EuiFlexItem>
        {onPreview && previewButtonLabel ? (
          <EuiFlexItem grow={false}>
            <EuiButton
              color="success"
              data-test-subj="markdownEditorRunPreviewButton"
              disabled={!isPreviewable}
              iconType="play"
              onClick={onPreview}
              size="s"
            >
              {previewButtonLabel}
            </EuiButton>
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem grow={false}>
          <EuiToolTip content={!isSaveable && !saveInProgress ? saveDisabledTooltip : undefined}>
            <SaveButton
              onSave={handleSave}
              disabled={!isSaveable || saveInProgress}
              isLoading={saveInProgress}
              label={saveButtonLabel}
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

const SaveButton = ({
  onSave,
  disabled,
  isLoading,
  label,
}: {
  onSave: () => Promise<void>;
  disabled?: boolean;
  isLoading?: boolean;
  label: string;
}) => {
  return (
    <EuiButton
      data-test-subj="markdownEditorApplyButton"
      size="s"
      color="primary"
      fill
      onClick={onSave}
      css={css({ minInlineSize: 'initial' })}
      disabled={disabled}
      isLoading={isLoading}
    >
      {label}
    </EuiButton>
  );
};
