/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

const KIBANA_HEADER_ID = 'kbnHeaderSecondBar';

interface UseTabGlueStylesProps {
  isSelected: boolean;
}

interface UseTabGlueStylesReturn {
  selectedTabBackgroundColor: string;
  tabGlueElement: React.ReactNode | undefined;
}

export const useTabGlueStyles = ({ isSelected }: UseTabGlueStylesProps): UseTabGlueStylesReturn => {
  const { euiTheme } = useEuiTheme();
  const selectedTabBackgroundColor = euiTheme.colors.emptyShade;
  const [hasClassicHeader] = useState<boolean>(() =>
    Boolean(document.getElementById(KIBANA_HEADER_ID))
  );

  return useMemo(() => {
    return {
      selectedTabBackgroundColor,
      tabGlueElement:
        hasClassicHeader && isSelected ? (
          <div
            css={css`
              background-color: ${selectedTabBackgroundColor};
              height: ${euiTheme.size.m};
              width: 100%;
              position: absolute;
              top: -${euiTheme.size.s};
              left: 0;
              z-index: ${Number(euiTheme.levels.header) + 1};
            `}
          />
        ) : undefined,
    };
  }, [selectedTabBackgroundColor, isSelected, euiTheme, hasClassicHeader]);
};
