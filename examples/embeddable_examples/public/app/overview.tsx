/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// @ts-ignore
import overviewMarkdown from '!!raw-loader!@kbn/embeddable-plugin/README.md';
import { EuiMarkdownFormat } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

export const Overview = () => {
  return (
    <EuiMarkdownFormat
      css={css`
        width: 75%;
      `}
    >
      {overviewMarkdown}
    </EuiMarkdownFormat>
  );
};
