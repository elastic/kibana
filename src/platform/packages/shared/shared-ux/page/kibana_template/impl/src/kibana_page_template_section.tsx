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
import { EuiPageTemplate, useEuiTheme, type EuiPageSectionProps } from '@elastic/eui';

const toCssArray = (value: EuiPageSectionProps['css'] | undefined) => {
  if (value == null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
};

/**
 * Kibana-wide default gutter for {@link EuiPageTemplate.Section}: `euiTheme.size.m` (12px in the
 * default Borealis theme). EUI's `paddingSize="l"` is 24px; `paddingSize="m"` maps to `size.base`
 * (16px), so we apply this token explicitly to get 12px horizontal + vertical insets.
 *
 * `paddingSize` values other than `undefined` and `l` are passed through to EUI unchanged.
 */
export const KibanaPageTemplateSection: React.FC<EuiPageSectionProps> = ({
  paddingSize,
  css: outerCssProp,
  contentProps,
  ...rest
}) => {
  const { euiTheme } = useEuiTheme();
  const useKibanaGutter = paddingSize === undefined || paddingSize === 'l';

  if (!useKibanaGutter) {
    return (
      <EuiPageTemplate.Section
        paddingSize={paddingSize}
        css={outerCssProp}
        contentProps={contentProps}
        {...rest}
      />
    );
  }

  const outerGutterCss = css`
    padding-inline: ${euiTheme.size.m};
  `;
  const innerGutterCss = css`
    padding-block: ${euiTheme.size.m};
  `;

  const mergedOuterCss = [outerGutterCss, ...toCssArray(outerCssProp)];
  const mergedInnerCss = [innerGutterCss, ...toCssArray(contentProps?.css)];

  return (
    <EuiPageTemplate.Section
      {...rest}
      paddingSize="none"
      css={mergedOuterCss}
      contentProps={{
        ...(contentProps ?? {}),
        css: mergedInnerCss,
      }}
    />
  );
};

KibanaPageTemplateSection.displayName = 'KibanaPageTemplateSection';
