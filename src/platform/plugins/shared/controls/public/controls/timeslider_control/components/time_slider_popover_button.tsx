/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiText, UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';

interface Props {
  onClick: () => void;
  formatDate: (epoch: number) => string;
  from: number;
  to: number;
}

const timeSliderStyles = {
  anchor: ({ euiTheme }: UseEuiTheme) => css`
    width: 100%;
    height: 100%;
    box-shadow: none;
    overflow: hidden;

    .euiText {
      &:hover {
        text-decoration: underline;
      }

      &:not(.euiFormControlLayoutDelimited__delimiter) {
        cursor: pointer !important;
      }
    }

    .timeSlider__anchorText {
      font-weight: ${euiTheme.font.weight.medium};
    }

    .timeSlider__anchorText--default {
      color: ${euiTheme.colors.mediumShade};
    }

    .timeSlider__anchorText--invalid {
      text-decoration: line-through;
      color: ${euiTheme.colors.mediumShade};
    }
  `,
};

export function TimeSliderPopoverButton(props: Props) {
  const styles = useMemoCss(timeSliderStyles);
  return (
    <button
      className="eui-textTruncate"
      color="text"
      onClick={props.onClick}
      data-test-subj="timeSlider-popoverToggleButton"
      css={styles.anchor}
    >
      <EuiText className="timeSlider__anchorText eui-textTruncate" size="s">
        <span>{props.formatDate(props.from)}</span>
        &nbsp;&nbsp;→&nbsp;&nbsp;
        <span>{props.formatDate(props.to)}</span>
      </EuiText>
    </button>
  );
}
