/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';

import { EuiButtonEmpty, EuiPopover, UseEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { Markdown } from '@kbn/shared-ux-markdown';
import { useErrorTextStyle } from '@kbn/react-hooks';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';

interface ControlErrorProps {
  error: Error | string;
}

const defaultMessage = i18n.translate('controls.blockingError', {
  defaultMessage: 'There was an error loading this control.',
});

const controlErrorStyles = {
  button: ({ euiTheme }: UseEuiTheme) =>
    css({
      width: '100%',
      height: euiTheme.size.xl,
      borderRadius: `0 ${euiTheme.border.radius.medium} ${euiTheme.border.radius.medium} 0 !important`,
    }),
  buttonContentCss: ({ euiTheme }: UseEuiTheme) =>
    css({
      justifyContent: 'left',
      paddingLeft: euiTheme.size.m,
    }),
  popover: ({ euiTheme }: UseEuiTheme) =>
    css({
      width: '100%',
      maxInlineSize: '100% !important',
      height: euiTheme.size.xl,
      boxShadow: 'none !important',
      borderRadius: `0 ${euiTheme.border.radius.medium} ${euiTheme.border.radius.medium} 0 !important`,
    }),
};

export const ControlError = ({ error }: ControlErrorProps) => {
  const errorTextStyle = useErrorTextStyle();
  const [isPopoverOpen, setPopoverOpen] = useState(false);
  const errorMessage = error instanceof Error ? error.message : error || defaultMessage;
  const styles = useMemoCss(controlErrorStyles);

  const popoverButton = (
    <EuiButtonEmpty
      flush="left"
      color="danger"
      iconSize="m"
      iconType="error"
      data-test-subj="control-frame-error"
      onClick={() => setPopoverOpen((open) => !open)}
      className="controlErrorButton"
      css={styles.button}
      contentProps={{ css: styles.buttonContentCss }}
    >
      <FormattedMessage
        id="controls.frame.error.message"
        defaultMessage="An error occurred. View more"
      />
    </EuiButtonEmpty>
  );

  return (
    <EuiPopover
      button={popoverButton}
      isOpen={isPopoverOpen}
      closePopover={() => setPopoverOpen(false)}
      css={styles.popover}
    >
      <Markdown data-test-subj="errorMessageMarkdown" readOnly css={errorTextStyle}>
        {errorMessage}
      </Markdown>
    </EuiPopover>
  );
};
