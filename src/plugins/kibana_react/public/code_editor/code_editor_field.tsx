/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { euiLightVars as lightTheme, euiDarkVars as darkTheme } from '@kbn/ui-theme';
import { EuiFormControlLayout } from '@elastic/eui';
import { CodeEditor, Props } from './code_editor';

/**
 * Renders a Monaco code editor in the same style as other EUI form fields.
 */
export const CodeEditorField: React.FunctionComponent<Props> = (props) => {
  const { width, height, options, fullWidth, useDarkTheme } = props;
  const theme = useDarkTheme ? darkTheme : lightTheme;
  const style = {
    width,
    height,
    backgroundColor: options?.readOnly
      ? theme.euiFormBackgroundReadOnlyColor
      : theme.euiFormBackgroundColor,
  };

  return (
    <EuiFormControlLayout
      append={<div hidden />}
      style={style}
      readOnly={options?.readOnly}
      fullWidth={fullWidth}
    >
      <CodeEditor {...props} transparentBackground />
    </EuiFormControlLayout>
  );
};
