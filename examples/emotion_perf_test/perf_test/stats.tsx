/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

export const Stats = React.memo(
  ({
    results,
    forceRerender,
    isDisabled,
    name,
    description,
    setResults,
  }: {
    results: string[];
    setResults: (arg: string[]) => void;
    forceRerender: () => void;
    isDisabled: boolean;
    name: string;
    description: string;
  }) => {
    return (
      <div className="perfTest__stats">
        <div>
          <button onClick={forceRerender} disabled={isDisabled}>
            Re-render
          </button>
          <button onClick={() => setResults([])}>Clear results</button>
        </div>
        <h3 className="perfTest__statsTitle"> {name}</h3>
        <h4 className="perfTest__statsDescription">{description}</h4>
        <div className="perfTest__statsResults">
          total rerender time:
          <div className="perfTest__statsResultsList">
            {results.map((r, i) => (
              <div key={i}>{r} ms</div>
            ))}
          </div>
        </div>
      </div>
    );
  }
);
