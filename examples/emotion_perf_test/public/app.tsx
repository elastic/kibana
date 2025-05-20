/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { css } from '@emotion/css';
import ReactDOM from 'react-dom';
import { AppMountParameters } from '@kbn/core-application-browser';

import { Global } from '@emotion/react';
import { EuiFieldNumber, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSpacer } from '@elastic/eui';

export const PerfTest = () => {
  const [rowCount, setRowCount] = useState(200);
  const [renderCount, setRenderCount] = useState(2);
  return (
    <div>
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
      <div
        css={{
          display: 'flex',
          justifyContent: 'space-between',
          '.perfTest': {
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
          },
          '.perfTestDisabled': {
            opacity: 0.5,
            color: '#E2F9F7',
            backgroundColor: '#C61E25',
          },
        }}
      >
        <Harness
          RowComponent={InlineRow}
          description="Styles inlined inside the component"
          renderCount={renderCount}
          rowCount={rowCount}
        />
        <Harness
          RowComponent={InlineRowB}
          description="styles inlines inside the component with the conditions outside of the css prop"
          renderCount={renderCount}
          rowCount={rowCount}
        />
        <Harness
          RowComponent={MemoRow}
          description="styles memoized inside the component"
          renderCount={renderCount}
          rowCount={rowCount}
        />
        <Harness
          RowComponent={VarRow}
          description="css variables scoped to the component"
          renderCount={renderCount}
          rowCount={rowCount}
        />
        <Harness
          RowComponent={VarRowB}
          description="css variables defined in the :root"
          renderCount={renderCount}
          rowCount={rowCount}
        />
        <Harness
          RowComponent={GlobalRow}
          description="An element styled by adding a classname on parent"
          renderCount={renderCount}
          rowCount={rowCount}
        />
      </div>
    </div>
  );
};

export const renderEmotionPerfApp = (element: AppMountParameters['element']) => {
  ReactDOM.render(<PerfTest />, element);
  return () => ReactDOM.unmountComponentAtNode(element);
};

let rootVars: Record<string, string | number> = {};

function Harness({
  RowComponent,
  description,
  renderCount,
  rowCount,
}: {
  RowComponent: ({ disabled, index }: { disabled: boolean; index: number }) => JSX.Element;
  description: string;
  renderCount: number;
  rowCount: number;
}) {
  const [disabled, setDisabled] = useState(false);
  const [count, setCount] = useState<null | number>(null);
  const start = useRef(performance.now());
  const [results, setResults] = useState<string[]>([]);

  useEffect(() => {
    if (count === null) {
      return;
    }
    // Run toggles back-to-back and measure
    if (typeof count === 'number' && count < renderCount) {
      setDisabled((d) => !d);
      setCount((c) => Number(c) + 1);
    }

    if (count === renderCount) {
      // Wait a tick for React to flush
      requestAnimationFrame(() => {
        const total = performance.now() - start.current;
        setResults((results) => results.concat(total.toFixed(2)));
        setCount(null);
      });
    }
  }, [setDisabled, count, rowCount]);

  const forceRerender = () => {
    setCount(0);
    start.current = performance.now();
  };

  if (RowComponent.name === 'VarRowB') {
    rootVars = {
      '--opacity': disabled ? 0.5 : 1,
      '--color': disabled ? '#E2F9F7' : '#E2F8F0',
      '--background': disabled ? '#C61E25' : '#008A5E',
    };
  }

  return (
    <div
      css={{
        padding: '4px',
        borderRight: '1px solid #AEE8D2',
        flex: '0 0 16.5%',
      }}
    >
      {RowComponent.name === 'VarRowB' && <Global styles={{ ':root': rootVars }} />}
      <div>
        <button
          onClick={forceRerender}
          css={{
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
          }}
          disabled={count !== null}
        >
          Re-render
        </button>
      </div>
      <div
        css={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fit, 30px)`,
          gap: `4px`,
        }}
      >
        {Array.from({ length: rowCount }).map((__, i) => (
          <RowComponent key={i} disabled={disabled} index={i} />
        ))}
      </div>
      <div
        css={{
          position: 'fixed',
          bottom: '0',
          borderRight: '1px solid #FFEDD6',
          backgroundColor: '#E5F6FA',
          width: '16.5%',
          padding: '4px',
          '.title': {
            fontSize: '14px',
          },
          '.description': {
            fontSize: '10px',
            color: '#516381',
            height: '40px',
          },
          '.stats': {
            fontSize: '12px',
            color: '#A71627',
            width: '100%',
          },
          '.statsNumber': {
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#A71627',
            height: '200px',
            overflow: 'scroll',
          },
        }}
      >
        <h3 className="title"> {RowComponent.name}</h3>
        <h4 className="description">{description}</h4>
        <div className="stats">
          {'total rerender time: '}
          <div className="statsNumber">
            {results.map((r, i) => (
              <div key={i}>{r} ms</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Case A: Emotion inline styles
const InlineRow = ({ disabled, index }: { disabled: boolean; index: number }) => (
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

// Case A: Emotion inline styles
const InlineRowB = ({ disabled, index }: { disabled: boolean; index: number }) => (
  <div
    css={[
      {
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
      },
      disabled && {
        opacity: 0.5,
        color: '#E2F9F7',
        backgroundColor: '#C61E25',
      },
    ]}
  >
    {index}
  </div>
);

// Case B: Emotion memoized
const useMemoStyles = (disabled: boolean) =>
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

const MemoRow = ({ disabled, index }: { disabled: boolean; index: number }) => {
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

const VarRow = ({ disabled, index }: { disabled: boolean; index: number }) => {
  const vars = {
    '--opacity': disabled ? 0.5 : 1,
    '--color': disabled ? '#E2F9F7' : '#E2F8F0',
    '--background': disabled ? '#C61E25' : '#008A5E',
  };
  return (
    <div className={baseClass} style={vars}>
      {index}
    </div>
  );
};

// with the root css variables TODO: structure it right
const VarRowB = ({ index }: { disabled: boolean; index: number }) => {
  return <div className={baseClass}>{index}</div>;
};

// Case D: Global utility class toggle
// (you’d define
// .disabled {
//   pointer-events:none;
//   ...
// } in your CSS)

const GlobalRow = ({ disabled, index }: { disabled: boolean; index: number }) => (
  <div className={disabled ? 'perfTestDisabled perfTest' : 'perfTest'}>{index}</div>
);
