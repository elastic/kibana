/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import { EuiButtonEmpty } from '@elastic/eui';
import { DimensionTrigger } from './trigger';

export const EmptyDimensionButton = ({
  label,
  ariaLabel,
  onClick,
  dataTestSubj,
  iconType,
  ...otherProps // from Drag&Drop integration
}: {
  label: React.ReactNode;
  ariaLabel: string;
  onClick: () => void;
  dataTestSubj?: string;
  iconType?: string;
}) => {
  return (
    <EuiButtonEmpty
      {...otherProps}
      css={css`
        width: 100%;
        border-radius: ${euiThemeVars.euiBorderRadius} !important;
        border: ${euiThemeVars.euiBorderWidthThin} dashed ${euiThemeVars.euiBorderColor} !important;
        padding: ${euiThemeVars.euiSizeXS} ${euiThemeVars.euiSizeS};
      `}
      color="text" // as far as I can tell all this currently adds is the correct active background color
      size="s"
      iconType={iconType ?? 'plus'}
      contentProps={{
        css: css`
          justify-content: flex-start;
          gap: ${euiThemeVars.euiSizeS};
          padding: 0 !important;
          color: ${euiThemeVars.euiTextSubduedColor};
        `,
      }}
      aria-label={ariaLabel}
      data-test-subj={dataTestSubj}
      onClick={() => {
        onClick();
      }}
    >
      <DimensionTrigger label={label} dataTestSubj="emptyDimensionTrigger" />
    </EuiButtonEmpty>
  );
};
