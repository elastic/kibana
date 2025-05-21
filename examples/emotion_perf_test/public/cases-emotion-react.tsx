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


// Case A: Emotion inline styles
export const InlineRow = ({ disabled, index }: { disabled: boolean; index: number }) => (
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
}

const disabledBase = {
  opacity: 0.5,
  color: '#E2F9F7',
  backgroundColor: '#C61E25',
}

// Case A: Emotion inline styles
export const InlineRowB = ({ disabled, index }: { disabled: boolean; index: number }) => (
  <div
    className={cx(
      css(base),
      css(disabled && disabledBase),
    )}
  >
    {index}
  </div>
);

// Case B: Emotion memoized
export  const useMemoStyles = (disabled: boolean) =>
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

  export const MemoRow = ({ disabled, index }: { disabled: boolean; index: number }) => {
  const cls = useMemoStyles(disabled);
  return <div className={cls}> {index}</div>;
};

// Case C: CSS variables + single base class
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

export const VarRow = ({ disabled, index }: { disabled: boolean; index: number }) => {
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

// with the root css variables TODO: structure it right
export const VarRowB = ({ index }: { disabled: boolean; index: number }) => {
  return <div className={baseClass}>{index}</div>;
};

// Case D: Global utility class toggle
export const GlobalRow = ({ disabled, index }: { disabled: boolean; index: number }) => (
  <div className={disabled ? 'perfTestDisabled perfTest' : 'perfTest'}>{index}</div>
);
