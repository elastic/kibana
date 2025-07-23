/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiMarkdownFormat, EuiMarkdownFormatProps, UseEuiTheme } from '@elastic/eui';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';

const markdownRendererStyles = {
  container: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: euiTheme.size.base,
      overflow: 'scroll',
      wordBreak: 'break-word',
      width: '100%',
      img: {
        maxInlineSize: '100%',
      },
    }),
};

export const MarkdownRenderer = ({
  content,
  processingPluginList,
}: {
  content: string;
  processingPluginList: EuiMarkdownFormatProps['processingPluginList'];
}) => {
  const styles = useMemoCss(markdownRendererStyles);
  return (
    <div css={styles.container}>
      <EuiMarkdownFormat processingPluginList={processingPluginList}>
        {content ?? ''}
      </EuiMarkdownFormat>
    </div>
  );
};
