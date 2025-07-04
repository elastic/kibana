/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { ComponentType } from 'react';
import { css } from '@emotion/react';
import { type UseEuiTheme } from '@elastic/eui';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { AggParamEditorProps } from '../../agg_param_props';

const containerStyles = {
  base: ({ euiTheme }: UseEuiTheme) =>
    css({
      margin: `${euiTheme.size.m} 0`,
      display: 'inline-block',
      width: `calc(50% - ${euiTheme.size.s} / 2)`,
    }),
  size: ({ euiTheme }: UseEuiTheme) =>
    css({
      marginLeft: `${euiTheme.size.s}`,
    }),
};

export const wrapWithInlineComp =
  <T extends unknown>(WrapComponent: ComponentType<AggParamEditorProps<T>>) =>
  (props: AggParamEditorProps<T>) => {
    const styles = useMemoCss(containerStyles);
    const hasSize = props.aggParam.name === 'size';
    return (
      <div css={[styles.base, hasSize && styles.size]}>
        <WrapComponent {...props} />
      </div>
    );
  };
