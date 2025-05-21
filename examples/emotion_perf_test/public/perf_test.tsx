/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { EuiFieldNumber, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSpacer, UseEuiTheme, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import { HarnessWrapper } from './harness';

export const PerfTest = () => {
  const [rowCount, setRowCount] = useState(2000);
  const [renderCount, setRenderCount] = useState(3);
  const euiThemeContext = useEuiTheme();
  return (
    <div className={perfTestStyles(euiThemeContext)}>
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <EuiFormRow label="Component count" helpText="How many components to render">
            <EuiFieldNumber
              aria-label="Component count"
              placeholder="Component count"
              value={rowCount}
              onChange={(e) => setRowCount(Number(e.target.value))}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow label="Rerender count" helpText="How many times to re-render the component">
            <EuiFieldNumber
              placeholder="Rerender count"
              value={renderCount}
              onChange={(e) => setRenderCount(Number(e.target.value))}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <HarnessWrapper renderCount={renderCount} rowCount={rowCount} />
    </div>
  );
};


const perfTestStyles = ({euiTheme}: UseEuiTheme) => css({
  '.perfTest__harnessWrapper': {
    display: 'flex',
    justifyContent: 'space-between',
  },
  '.perfTest': {
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
  },
  '.perfTestDisabled': {
    opacity: 0.5,
    color: '#E2F9F7',
    backgroundColor: '#C61E25',
  },
  '.perfTest__harness': {
    padding: '4px',
    borderRight: '1px solid #AEE8D2',
    position: 'relative',
    flex: '0 0 16.5%',
  },

  '.perfTest__harnessGrid': {
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fit, 30px)`,
    gap: `4px`,
  },

  '.perfTest__stats': {
    position: 'fixed',
    bottom: '0',
    borderRight: '1px solid #FFEDD6',
    backgroundColor: '#E5F6FA',
    width: '16.5%',
    padding: '4px',
    button: {
      backgroundColor: '#D9E8FF',
      color: '#1750ba',
      borderRadius: '4px',
      paddingInline: '12px',
      margin: '4px',
      '&:disabled, &[disabled]': {
        backgroundColor: '#E5F6FA',
        color: '#A71627',
        cursor: 'wait',
      },
    },
    '.perfTest__statsTitle': {
      fontSize: '14px',
    },
    '.perfTest__statsDescription': {
      fontSize: '10px',
      color: '#516381',
      height: '40px',
    },
    '.perfTest__statsResults': {
      fontSize: '12px',
      color: '#A71627',
      width: '100%',
    },
    '.perfTest__statsResultsList': {
      fontSize: '16px',
      fontWeight: 'bold',
      color: '#A71627',
      height: '200px',
      overflow: 'scroll',
    },
  },
});
