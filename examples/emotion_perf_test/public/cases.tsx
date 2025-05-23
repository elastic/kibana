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
import { TestCase } from './types';



const base = {
  outline: 0,
  border: 0,
  margin: '2px 2px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'anchor-center',
  height: '30px',
  fontSize: '20px',
  width: '30px',
  opacity: 1,
  color: '#E2F8F0',
  backgroundColor: '#008A5E',
};

const disabledBase = {
  opacity: 0.5,
  color: '#E2F9F7',
  backgroundColor: '#C61E25',
};

const disabledBas = {
  ...base,
  ...disabledBase,
};


// Control Case:  inline style tag
export const ControlRow = ({
  disabled,
  index,
}: {
  disabled: boolean;
  index: number;
}) => {
  return (
    <div
      style={
        disabled
          ? {
              ...base,
              ...disabledBase,
            }
          : {
              outline: 0,
              border: 0,
              margin: "2px 2px",
              display: "flex",
              justifyContent: "center",
              alignItems: "anchor-center",
              height: "30px",
              fontSize: "20px",
              width: "30px",
              opacity: 1,
              color: "#E2F8F0",
              backgroundColor: "#008A5E",
            }
      }
    >
      {index}
    </div>
  );
};

// Case A: Emotion inline styles
export const InlineStylesRow = ({ disabled, index }: { disabled: boolean; index: number }) => {
  return (
    <div
      css={{
        outline: 0,
        border: 0,
        margin: '2px 2px',
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

// Case B: The styles are defined outside, but the condition is within css prop

export const ComposedStylesRow = ({ disabled, index }: { disabled: boolean; index: number }) => {
  return <div className={cx(css(base), css(disabled && disabledBase))}>{index}</div>;
};

// Case C: Styles are memoized
export const useMemoStyles = (disabled: boolean) =>
  useMemo(
    () =>
      css({
        outline: 0,
        border: 0,
        margin: '2px 2px',
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

export const MemoizedStylesRow = ({ disabled, index }: { disabled: boolean; index: number }) => {
  const cls = useMemoStyles(disabled);
  return <div className={cls}> {index}</div>;
};

// Case D: CSS variables scoped to the component + single base class
const baseClass = css({
  outline: 0,
  border: 0,
  margin: '2px 2px',
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

export const ScopedCSSVarRow = ({ disabled, index }: { disabled: boolean; index: number }) => {
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

export const testCases: TestCase[] = [
  { component: InlineStylesRow, description: 'Styles inlined in the component' },
  {
    component: ComposedStylesRow,
    description: 'Styles declared outside of the component but composed inside as an array',
  },
  { component: MemoizedStylesRow, description: 'Styles memoized in the component' },
  { component: ScopedCSSVarRow, description: 'Css variables scoped to the component' },
  // {
  //   component: RootCSSVarRow,
  //   description: 'Css variables defined in the :root (the practice we should never use for the variables that change often!!!)',
  //   mountRootVars: true,
  // },
  {
    component: ControlRow,
    description: 'Control case: inline style tag',
  },
  { component: ClassNameRow, description: 'An element styled by adding a classname on parent' },
];

