/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useState, useMemo, useEffect } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';

const KIBANA_HEADER_ID = 'kbnHeaderSecondBar';

const globalCss = css`
  overscroll-behavior: none;
`;

interface UseTabGlueStylesProps {
  isSelected: boolean;
}

interface UseTabGlueStylesReturn {
  selectedTabBackgroundColor: string;
  shouldOverflow: boolean;
}

export const useTabsOverflow = ({ isSelected }: UseTabGlueStylesProps): UseTabGlueStylesReturn => {
  const { euiTheme } = useEuiTheme();
  const selectedTabBackgroundColor = euiTheme.colors.emptyShade;
  const [hasClassicHeader] = useState<boolean>(() =>
    Boolean(document.getElementById(KIBANA_HEADER_ID))
  );

  useEffect(() => {
    if (!isSelected) {
      return;
    }

    document.body.classList.add(globalCss);

    return () => {
      document.body.classList.remove(globalCss);
    };
  }, [isSelected]);

  return useMemo(() => {
    return {
      selectedTabBackgroundColor,
      shouldOverflow: isSelected && hasClassicHeader,
    };
  }, [selectedTabBackgroundColor, isSelected, hasClassicHeader]);
};
