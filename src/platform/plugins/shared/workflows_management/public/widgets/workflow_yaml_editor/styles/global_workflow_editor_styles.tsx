/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme } from '@elastic/eui';
import { Global } from '@emotion/react';
import React from 'react';
import { getBaseTypeIconsStyles } from './get_base_type_icons_styles';
import { getMonacoWorkflowOverridesStyles } from './get_monaco_workflow_overrides_styles';

export const GlobalWorkflowEditorStyles = () => {
  const euiThemeContext = useEuiTheme();
  return (
    <Global
      styles={[
        getBaseTypeIconsStyles(euiThemeContext),
        getMonacoWorkflowOverridesStyles(euiThemeContext),
      ]}
    />
  );
};
