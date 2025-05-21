/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useEffect, useRef } from 'react';
import { Global } from '@emotion/react';
import { css } from '@emotion/css';
import {
  ClassNameRow,
  InlineStylesRow,
  ComposedStylesRow,
  MemoizedStylesRow,
  ScopedCSSVarRow,
  RootCSSVarRow,
} from './cases_eui';
import { Stats } from './stats';

interface TestCase {
  component: ({ disabled, index }: { disabled: boolean; index: number }) => JSX.Element;
  description: string;
  mountRootVars?: boolean;
}

const test: TestCase[] = [
  { component: InlineStylesRow, description: 'Styles inlined in the component' },
  {
    component: ComposedStylesRow,
    description: 'Styles declared outside of the component but composed inside as an array',
  },
  { component: MemoizedStylesRow, description: 'Styles memoized in the component' },
  { component: ScopedCSSVarRow, description: 'Css variables scoped to the component' },
  {
    component: RootCSSVarRow,
    description: 'Css variables defined in the :root',
    mountRootVars: true,
  },
  { component: ClassNameRow, description: 'An element styled by adding a classname on parent' },
];

export const HarnessWrapper = (props: { renderCount: number; rowCount: number }) => {
  return (
    <div className="perfTest__harnessWrapper">
      {test.map(({ component, description, mountRootVars }) => (
        <Harness
          key={component.name}
          RowComponent={component}
          description={description}
          mountRootVars={mountRootVars}
          {...props}
        />
      ))}
    </div>
  );
};

let rootVars: Record<string, string | number> = {};

function Harness({
  RowComponent,
  description,
  renderCount,
  rowCount,
  mountRootVars = false,
  wastedRerender = true, // I am referring here to the rerender without any actual change in state or props for the children
}: {
  RowComponent: ({ disabled, index }: { disabled: boolean; index: number }) => JSX.Element;
  description: string;
  renderCount: number;
  rowCount: number;
  mountRootVars?: boolean;
  wastedRerender?: boolean;
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
      if (!wastedRerender) {
        setDisabled((d) => !d);
      }
      setCount((c) => Number(c) + 1);
    }

    if (count === renderCount) {
      // Wait a tick for React to flush
      const total = performance.now() - start.current;
      setResults((results) => results.concat(total.toFixed(2)));
      setCount(null);
    }
  }, [setDisabled, count, rowCount]);

  const forceRerender = () => {
    if (count === null) {
      setCount(0);
      start.current = performance.now();
    }
  };

  if (mountRootVars) {
    rootVars = {
      '--opacity': disabled ? 0.5 : 1,
      '--color': disabled ? '#E2F9F7' : '#E2F8F0',
      '--background': disabled ? '#C61E25' : '#008A5E',
    };
  }

  return (
    <>
      {mountRootVars && <Global styles={{ ':root': rootVars }} />}
      <div className={'perfTest__harness'}>
        <div className={'perfTest__harnessGrid'}>
          {Array.from({ length: rowCount }).map((__, i) => (
            <RowComponent key={i} disabled={disabled} index={i} />
          ))}
        </div>
        <Stats
          results={results}
          forceRerender={forceRerender}
          isDisabled={count !== null}
          name={RowComponent.name}
          description={description}
          setResults={setResults}
        />
      </div>
    </>
  );
}
