/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
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

export const MarkdownFooter = ({
  onCancel,
  onSave,
  isPreview,
  cancelButtonRef,
  isSaveable,
}: {
  onCancel: () => void;
  onSave: () => void;
  isPreview?: boolean;
  cancelButtonRef: React.RefObject<HTMLButtonElement>;
  isSaveable?: boolean;
}) => {
  const styles = useMemoCss(footerStyles);
  return (
    <div css={[styles.footer, isPreview && styles.previewFooter]}>
      {/* Hidden descriptive text for screen readers */}
      <p id={FOOTER_HELP_TEXT} hidden>
        {strings.markdownFooterHelpText}
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
            size="xs"
            onClick={onCancel}
            buttonRef={cancelButtonRef}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Escape') {
                onCancel();
              }
            }}
          >
            {strings.discardButton}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {isSaveable ? (
            <SaveButton onSave={onSave} />
          ) : (
            <EuiToolTip content={strings.applyButtonDisabledTooltip}>
              <SaveButton onSave={onSave} disabled />
            </EuiToolTip>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

const SaveButton = ({ onSave, disabled }: { onSave: () => void; disabled?: boolean }) => {
  return (
    <EuiButton
      data-test-subj="markdownEditorApplyButton"
      size={'xs' as 's'}
      color="primary"
      fill
      onClick={onSave}
      css={css({ minInlineSize: 'initial' })}
      disabled={disabled}
    >
      {strings.applyButton}
    </EuiButton>
  );
};
