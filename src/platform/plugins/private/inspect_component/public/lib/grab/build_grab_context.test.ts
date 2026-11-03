/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildGrabContext, getGrabLabel, getRepoRoot } from './build_grab_context';
import type { DebugSource, ReactFiberNode } from '../fiber/types';

const REPO_ROOT = '/Users/dev/kibana/';

const createFiber = (
  type: string,
  debugSource?: DebugSource,
  debugOwner?: ReactFiberNode | null
): ReactFiberNode => ({
  type,
  _debugSource: debugSource,
  _debugOwner: debugOwner,
});

const createSource = (relativePath: string, lineNumber: number): DebugSource => ({
  fileName: `${REPO_ROOT}${relativePath}`,
  lineNumber,
  columnNumber: 5,
});

describe('buildGrabContext', () => {
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement('button');
    element.className = 'euiButton';
    element.setAttribute('data-test-subj', 'saveButton');
    element.innerHTML = '<span class="euiButton__text">  Save\n changes </span>';
  });

  it('should build an HTML snippet followed by the component stack with repo relative paths', () => {
    const appFiber = createFiber('FooApp');
    const panelFiber = createFiber(
      'FooPanel',
      createSource('src/foo/application.tsx', 30),
      appFiber
    );
    const saveButtonFiber = createFiber(
      'SaveButton',
      createSource('src/foo/foo_panel.tsx', 118),
      panelFiber
    );
    const euiButtonFiber = createFiber(
      'EuiButton',
      createSource('src/foo/save_button.tsx', 42),
      saveButtonFiber
    );

    const result = buildGrabContext({
      element,
      targetFiberNode: euiButtonFiber,
      repoRoot: REPO_ROOT,
    });

    expect(result).toBe(
      [
        '<button class="euiButton" data-test-subj="saveButton">Save changes</button>',
        '  in SaveButton (src/foo/save_button.tsx:42:5)',
        '  in FooPanel (src/foo/foo_panel.tsx:118:5)',
        '  in FooApp (src/foo/application.tsx:30:5)',
      ].join('\n')
    );
  });

  it('should skip fibers without source and name frames after the closest non-EUI owner', () => {
    const tableFiber = createFiber('MyTable');
    const euiTableFiber = createFiber('EuiInMemoryTable', undefined, tableFiber);
    const euiCellFiber = createFiber('EuiTableRowCell', undefined, euiTableFiber);
    const cellFiber = createFiber('MyCell', createSource('src/foo/my_table.tsx', 55), euiCellFiber);

    const result = buildGrabContext({ element, targetFiberNode: cellFiber });

    expect(result).toBe(
      [
        '<button class="euiButton" data-test-subj="saveButton">Save changes</button>',
        `  in MyTable (${REPO_ROOT}src/foo/my_table.tsx:55:5)`,
      ].join('\n')
    );
  });

  it('should truncate long text content and return only the snippet without a fiber', () => {
    element.textContent = 'x'.repeat(100);

    const result = buildGrabContext({ element, targetFiberNode: null });

    expect(result).toBe(
      `<button class="euiButton" data-test-subj="saveButton">${'x'.repeat(80)}…</button>`
    );
  });
});

describe('getRepoRoot', () => {
  it('should strip the relative path from the file name and reject mismatches', () => {
    expect(getRepoRoot(`${REPO_ROOT}src/foo/save_button.tsx`, 'src/foo/save_button.tsx')).toBe(
      REPO_ROOT
    );
    expect(getRepoRoot('/elsewhere/save_button.tsx', 'src/foo/save_button.tsx')).toBeNull();
  });
});

describe('getGrabLabel', () => {
  it('should combine the component name with the base file name and line number', () => {
    expect(getGrabLabel('SaveButton', createSource('src/foo/save_button.tsx', 42))).toBe(
      'SaveButton · save_button.tsx:42'
    );
  });
});
