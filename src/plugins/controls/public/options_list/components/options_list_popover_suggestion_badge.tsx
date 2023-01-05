/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { css } from '@emotion/react';
import { EuiText, EuiToolTip, useEuiTheme } from '@elastic/eui';

import { OptionsListStrings } from './options_list_strings';

export const OptionsListPopoverSuggestionBadge = ({ documentCount }: { documentCount: number }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiToolTip
      content={OptionsListStrings.popover.getDocumentCountTooltip(documentCount)}
      position={'right'}
    >
      <EuiText
        size="xs"
        aria-hidden={true}
        className="eui-textNumber"
        color={euiTheme.colors.subduedText}
        css={css`
          font-weight: ${euiTheme.font.weight.medium} !important;
        `}
      >
        {`${documentCount.toLocaleString()}`}
      </EuiText>
    </EuiToolTip>
  );
};
