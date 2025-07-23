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
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  UseEuiTheme,
  euiCanAnimate,
} from '@elastic/eui';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';

const footerStyles = {
  footer: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: euiTheme.size.s,
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
    }),
  flexGroup: css({
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

const markdownFooterStrings = {
  discardButton: i18n.translate('embeddableExamples.euiMarkdownEditor.discardButton', {
    defaultMessage: 'Discard',
  }),
  applyButton: i18n.translate('embeddableExamples.euiMarkdownEditor.applyButton', {
    defaultMessage: 'Apply',
  }),
};

export const MarkdownFooter = ({
  onCancel,
  onSave,
  isPreview,
}: {
  onCancel: () => void;
  onSave: () => void;
  isPreview?: boolean;
}) => {
  const styles = useMemoCss(footerStyles);
  return (
    <div css={[styles.footer, isPreview && styles.previewFooter]}>
      <EuiFlexGroup
        responsive={false}
        gutterSize="xs"
        justifyContent="flexEnd"
        css={styles.flexGroup}
      >
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty color="primary" size="xs" onClick={onCancel}>
            {markdownFooterStrings.discardButton}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton size={'xs' as 's'} iconType={'check'} color="primary" fill onClick={onSave}>
            {markdownFooterStrings.applyButton}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
