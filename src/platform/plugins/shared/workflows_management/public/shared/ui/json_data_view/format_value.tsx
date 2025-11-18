/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

/**
 * Formats a value as a React element with proper highlighting for arrays.
 * This safely renders arrays with highlighted brackets and commas.
 */
export function formatValueAsElement(value: unknown): React.ReactElement | string {
  if (value === null || value === undefined) {
    return '-';
  }
  if (Array.isArray(value)) {
    return (
      <>
        <span className="ffArray__highlight">{'['}</span>
        {value.map((item, index) => (
          <React.Fragment key={index}>
            {index > 0 && <span className="ffArray__highlight">{', '}</span>}
            {formatValueAsElement(item)}
          </React.Fragment>
        ))}
        <span className="ffArray__highlight">{']'}</span>
      </>
    );
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}
