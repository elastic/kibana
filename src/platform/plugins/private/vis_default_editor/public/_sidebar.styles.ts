/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type UseEuiTheme, COLOR_MODES_STANDARD, euiFontSize } from '@elastic/eui';
import { css } from '@emotion/react';

export const visEditorSidebarStyles = {
  section: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.emptyShade,
      padding: euiTheme.size.s,
      borderRadius: euiTheme.border.radius.medium,
      '+ .visEditorSidebar__section': {
        marginTop: euiTheme.size.s,
      },
    }),
  collapsible: ({ euiTheme, colorMode }: UseEuiTheme) =>
    css({
      backgroundColor:
        colorMode === COLOR_MODES_STANDARD.light
          ? euiTheme.colors.backgroundBaseSubdued
          : euiTheme.colors.backgroundBaseFormsPrepend,
    }),
  collapsibleMarginBottom: ({ euiTheme }: UseEuiTheme) =>
    css({
      marginBottom: euiTheme.size.m,
    }),
  aggGroupAccordionButtonContent: (euiThemeContext: UseEuiTheme) =>
    css({
      '.visEditorSidebar__aggGroupAccordionButtonContent': {
        fontSize: euiFontSize(euiThemeContext, 's').fontSize,
        span: {
          color: euiThemeContext.euiTheme.colors.darkShade,
        },
      },
    }),
};
