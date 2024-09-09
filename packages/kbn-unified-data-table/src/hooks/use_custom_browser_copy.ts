/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';

export const useCustomBrowserCopyForGrid = () => {
  useEffect(() => {
    document.addEventListener('copy', handleCopy);

    return () => {
      document.removeEventListener('copy', handleCopy);
    };
  }, []);
};

function handleCopy(event: ClipboardEvent) {
  const selection = window.getSelection();
  const range = selection?.getRangeAt(0);
  const grid = document.querySelector('[role="grid"]');

  if (!range || !grid) {
    return;
  }

  let tsvData = '';

  const rows = grid.querySelectorAll('[role="row"]');
  rows.forEach((row) => {
    const cells = row.querySelectorAll(
      '[role="gridcell"]:not(.euiDataGridRowCell--controlColumn) .euiDataGridRowCell__content'
    );
    const cellsTextContent: string[] = [];
    let hasSelectedCell = false;

    cells.forEach((cell) => {
      if (range.intersectsNode(cell)) {
        cellsTextContent.push(cell.textContent || '');
        hasSelectedCell = true;
      } else {
        cellsTextContent.push('');
      }
    });

    if (cellsTextContent.length > 0 && hasSelectedCell) {
      tsvData += cellsTextContent.join('\t') + '\n';
    }
  });

  if (tsvData && event.clipboardData) {
    event.preventDefault();
    event.clipboardData.setData('text/plain', tsvData);
  }
}
