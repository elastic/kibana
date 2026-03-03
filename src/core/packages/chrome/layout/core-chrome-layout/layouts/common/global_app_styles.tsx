/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type UseEuiTheme, useEuiTheme } from '@elastic/eui';
import { css, Global } from '@emotion/react';
import React from 'react';

// Due to pure HTML and the scope being large, we decided to temporarily apply following 4 style blocks globally.
// TODO: refactor within github issue #223571
const hackGlobalFieldFormattersPluginStyles = (euiTheme: UseEuiTheme['euiTheme']) => css`
  // Styles applied to the span.ffArray__highlight from FieldFormat class that is used to visually distinguish array delimiters when rendering array values as HTML in Kibana field formatters
  .ffArray__highlight {
    color: ${euiTheme.colors.mediumShade};
  }

  // Styles applied to the span.ffSearch__highlight from FieldFormat class that is used to visually distinguish highlighted string values when rendering string values as HTML in Kibana field formatters
  .ffSearch__highlight {
    text-decoration: dotted underline;
  }

  // Styles applied to the span.ffString__emptyValue from FieldFormat class that is used to visually distinguish empty string values when rendering string values as HTML in Kibana field formatters
  .ffString__emptyValue {
    color: ${euiTheme.colors.darkShade};
  }

  .lnsTableCell--colored .ffString__emptyValue {
    color: unset;
  }
`;

/**
 * Global styles that are common for any type of layout.
 */
export const CommonGlobalAppStyles = () => {
  const { euiTheme } = useEuiTheme();
  return (
    <Global
      styles={css`
        ${hackGlobalFieldFormattersPluginStyles(euiTheme)}
      `}
    />
  );
};
