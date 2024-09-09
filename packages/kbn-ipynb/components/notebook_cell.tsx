/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiMarkdownFormat, EuiCodeBlock, EuiTitle } from '@elastic/eui';

import { NotebookCellType } from '../types';
import { combineSource } from '../utils';

export const NotebookCell = ({ cell, language }: { cell: NotebookCellType; language: string }) => {
  if (!cell.cell_type) return null;
  const content = cell.source
    ? combineSource(cell.source)
    : cell.input
    ? combineSource(cell.input)
    : null;

  if (!content) return null;

  switch (cell.cell_type) {
    case 'markdown':
      return <EuiMarkdownFormat>{content}</EuiMarkdownFormat>;
    case 'code':
      return (
        <EuiCodeBlock language={language} lineNumbers isCopyable>
          {content}
        </EuiCodeBlock>
      );
    case 'heading':
      return (
        <EuiTitle>
          <h2>{content}</h2>
        </EuiTitle>
      );
  }
  return null;
};
