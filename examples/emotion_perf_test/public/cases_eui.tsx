/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { css, cx } from '@emotion/css';
import { UseEuiTheme, euiThemeCssVariables, useEuiTheme } from '@elastic/eui';
import { TestCase } from './types';

// Case A: Emotion inline styles
export const InlineStylesRow = ({ disabled, index }: { disabled: boolean; index: number }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={{
        outline: 0,
        border: 0,
        margin: euiTheme.size.xxs,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'anchor-center',
        height: '30px',
        fontSize: '20px',
        width: '30px',
        opacity: disabled ? 0.5 : 1,
        color: disabled ? '#E2F9F7' : '#E2F8F0',
        backgroundColor: disabled ? '#C61E25' : '#008A5E',
      }}
    >
      {index}
    </div>
  );
};

const base = ({ euiTheme }: UseEuiTheme) => ({
  outline: 0,
  border: 0,
  margin: euiTheme.size.xxs,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'anchor-center',
  height: '30px',
  fontSize: '20px',
  width: '30px',
  opacity: 1,
  color: '#E2F8F0',
  backgroundColor: '#008A5E',
});

const disabledBase = {
  opacity: 0.5,
  color: '#E2F9F7',
  backgroundColor: '#C61E25',
};

// Case B: The condition is outside of the css prop
export const ComposedStylesRow = ({ disabled, index }: { disabled: boolean; index: number }) => {
  const euiThemeContext = useEuiTheme();
  return (
    <div className={cx(css(base(euiThemeContext)), css(disabled && disabledBase))}>{index}</div>
  );
};

// Case C: Styles are memoized
export const useMemoStyles = (disabled: boolean) => {
  const { euiTheme } = useEuiTheme();
  const memoizedStyles = useMemo(
    () =>
      css({
        outline: 0,
        border: 0,
        margin: euiTheme.size.xxs,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'anchor-center',
        height: '30px',
        fontSize: '20px',
        width: '30px',
        opacity: disabled ? 0.5 : 1,
        color: disabled ? '#E2F9F7' : '#E2F8F0',
        backgroundColor: disabled ? '#C61E25' : '#008A5E',
      }),
    [disabled]
  );
  return memoizedStyles;
};
export const MemoizedStylesRow = ({ disabled, index }: { disabled: boolean; index: number }) => {
  const cls = useMemoStyles(disabled);
  return <div className={cls}> {index}</div>;
};

// // Case D: CSS variables scoped to the component + single base class
const baseClass = css({
  outline: 0,
  border: 0,
  margin: euiThemeCssVariables.size.xxs,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'anchor-center',
  height: '30px',
  fontSize: '20px',
  width: '30px',
  opacity: 'var(--opacity, 1)',
  color: 'var(--color, #E2F8F0)',
  background: 'var(--background, #008A5E)',
});

export const EuiCSSVariables = ({ disabled, index }: { disabled: boolean; index: number }) => {
  const vars = {
    '--opacity': disabled ? 0.5 : 1,
    '--color': disabled ? '#E2F9F7' : '#E2F8F0',
    '--background': disabled ? '#C61E25' : '#008A5E',
  } as React.CSSProperties;
  return (
    <div className={baseClass} style={vars}>
      {index}
    </div>
  );
};

// Case E: CSS variables added to the root + single base class
export const RootCSSVarRow = ({ index }: { disabled: boolean; index: number }) => {
  return <div className={baseClass}>{index}</div>;
};

// Case F: Styling through setting a classname and adding styles to the parent
export const ClassNameRow = ({ disabled, index }: { disabled: boolean; index: number }) => {
  return <div className={disabled ? 'perfTestDisabled perfTest' : 'perfTest'}>{index}</div>;
};

export const euiTestCases: TestCase[] = [
  { component: InlineStylesRow, description: 'Styles with euiTheme inlined in the component' },
  {
    component: ComposedStylesRow,
    description: 'Styles declared outside of the component (with syntatic callback syntax to reach for euiTheme) but composed inside as an array',
  },
  { component: MemoizedStylesRow, description: 'Styles memoized in the component' },
  {
    component: EuiCSSVariables,
    description: 'euiTheme css variables',
  },
  // {
  //   component: RootCSSVarRow,
  //   description: 'css variables defined in the :root + euiTheme css variables',
  //   mountRootVars: true,
  // },
  { component: ClassNameRow, description: 'An element styled by adding a classname on parent' },
];
