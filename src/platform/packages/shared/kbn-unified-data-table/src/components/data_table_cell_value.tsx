/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { type UseEuiTheme, euiFontSize } from '@elastic/eui';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';

export const DataTablePopoverCellValue = ({ children }: { children: React.ReactNode }) => {
  const styles = useMemoCss(componentStyles);

  return (
    <span className="unifiedDataTable__cellPopoverValue eui-textBreakWord" css={styles.popover}>
      {children}
    </span>
  );
};

// eslint-disable-next-line import/no-default-export
export default DataTablePopoverCellValue;

const componentStyles = {
  popover: (themeContext: UseEuiTheme) => {
    const { euiTheme } = themeContext;
    const { fontSize } = euiFontSize(themeContext, 's');

    return css({
      fontFamily: euiTheme.font.familyCode,
      fontSize,
    });
  },
};
