/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DebugSource, ReactFiberNode } from '@kbn/react-fiber';
import { buildGrabContext, getRepoRoot } from './build_grab_context';

const REPO_ROOT = '/Users/dev/kibana/';

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
    const panel: ReactFiberNode = {
      type: { name: 'FooPanel' },
      _debugSource: createSource('src/foo/application.tsx', 30),
      _debugOwner: { type: { name: 'FooApp' } },
    };
    const saveButton: ReactFiberNode = {
      type: { name: 'SaveButton' },
      _debugSource: createSource('src/foo/foo_panel.tsx', 118),
      _debugOwner: panel,
    };
    const euiButton: ReactFiberNode = {
      type: { displayName: 'EuiButton' },
      _debugSource: createSource('src/foo/save_button.tsx', 42),
      _debugOwner: saveButton,
    };

    const result = buildGrabContext({ element, fiber: euiButton, repoRoot: REPO_ROOT });

    expect(result).toBe(
      [
        '<button class="euiButton" data-test-subj="saveButton">Save changes</button>',
        '  in SaveButton (src/foo/save_button.tsx:42:5)',
        '  in FooPanel (src/foo/foo_panel.tsx:118:5)',
        '  in FooApp (src/foo/application.tsx:30:5)',
      ].join('\n')
    );
  });

  it('should keep absolute paths without a repo root', () => {
    const cell: ReactFiberNode = {
      type: { name: 'MyCell' },
      _debugSource: createSource('src/foo/my_table.tsx', 55),
      _debugOwner: { type: { name: 'MyTable' } },
    };

    const result = buildGrabContext({ element, fiber: cell });

    expect(result).toBe(
      [
        '<button class="euiButton" data-test-subj="saveButton">Save changes</button>',
        `  in MyTable (${REPO_ROOT}src/foo/my_table.tsx:55:5)`,
      ].join('\n')
    );
  });

  it('should truncate long text content and return only the snippet without a fiber', () => {
    element.textContent = 'x'.repeat(100);

    const result = buildGrabContext({ element, fiber: null });

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
