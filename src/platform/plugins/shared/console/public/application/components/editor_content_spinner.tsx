/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { EuiLoadingSpinner, EuiPageSection, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

const useStyles = () => {
  const { euiTheme } = useEuiTheme();
  return {
    editorSpinner: css`
      width: 100%;
      background-color: ${euiTheme.colors.backgroundBaseSubdued};
    `,
  };
};

export const EditorContentSpinner: FunctionComponent = () => {
  const styles = useStyles();
  return (
    <EuiPageSection alignment="center" grow={true} css={styles.editorSpinner}>
      <EuiLoadingSpinner size="xxl" />
    </EuiPageSection>
  );
};
