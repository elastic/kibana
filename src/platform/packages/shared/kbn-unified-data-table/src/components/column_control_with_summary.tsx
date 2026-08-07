/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { isValidElement } from 'react';
import { EuiHorizontalRule, useEuiTheme, type UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { SummaryColumnToggle } from './summary_column_toggle';

interface ColumnControlWithSummaryProps {
  columnControl: React.ReactElement;
  showSummaryColumn: boolean;
  isSummaryColumnToggleDisabled: boolean;
  onChangeShowSummaryColumn: (showSummaryColumn: boolean) => void;
}

/**
 * Injects the Summary column switch at the top of EUI's Columns popover.
 * EUI's column selector has no customRender API, so we clone the popover and
 * prepend our control before the existing reorder list.
 */
export const ColumnControlWithSummary = ({
  columnControl,
  showSummaryColumn,
  isSummaryColumnToggleDisabled,
  onChangeShowSummaryColumn,
}: ColumnControlWithSummaryProps): React.ReactElement => {
  const { euiTheme } = useEuiTheme();

  if (!isValidElement<{ children?: React.ReactNode }>(columnControl)) {
    return columnControl;
  }

  return React.cloneElement(columnControl, {
    children: (
      <>
        <div css={getSummaryToggleCss({ euiTheme })} data-test-subj="columnSelectorSummaryToggle">
          <SummaryColumnToggle
            dataTestSubj="columnSelectorShowSummaryColumn"
            checked={showSummaryColumn}
            disabled={isSummaryColumnToggleDisabled}
            onChange={onChangeShowSummaryColumn}
          />
        </div>
        <EuiHorizontalRule margin="none" />
        {columnControl.props.children}
      </>
    ),
  });
};

const getSummaryToggleCss = ({ euiTheme }: UseEuiTheme) =>
  euiTheme
    ? css`
        padding: ${euiTheme.size.s};
      `
    : undefined;
