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
const FOO_PLUGIN = 'src/platform/plugins/shared/foo/public';

const createSource = (relativePath: string, lineNumber: number): DebugSource => ({
  fileName: `${REPO_ROOT}${relativePath}`,
  lineNumber,
  columnNumber: 5,
});

// Functions passed inline, e.g. to `memo`, have no name unlike the ones assigned to a variable
const createAnonymousComponent = () => () => null;

/** Links the fibers into an owner chain, closest first, and returns the closest one. */
const createOwnerChain = (fibers: ReactFiberNode[]): ReactFiberNode | null =>
  fibers.reduceRight<ReactFiberNode | null>(
    (owner, fiber) => ({ ...fiber, _debugOwner: owner }),
    null
  );

/**
 * A button deep in the foo plugin, rendered through a Route by the bar plugin. Each fiber's
 * source is the JSX of its element, the frame it yields is named after its owner.
 */
const fooAppFiber = createOwnerChain([
  {
    type: { displayName: 'EuiButton' },
    _debugSource: createSource(`${FOO_PLUGIN}/save_button.tsx`, 42),
  },
  {
    // rendered by an unnamed higher order component, yielding an Anonymous frame
    type: { name: 'SaveButton' },
    _debugSource: createSource(`${FOO_PLUGIN}/with_tracking.tsx`, 10),
  },
  {
    type: { type: createAnonymousComponent() },
    _debugSource: createSource(`${FOO_PLUGIN}/foo_panel.tsx`, 118),
  },
  {
    // a second frame of foo_panel.tsx, collapsed into the previous one
    type: { name: 'FooPanel' },
    _debugSource: createSource(`${FOO_PLUGIN}/foo_panel.tsx`, 140),
  },
  {
    type: { name: 'FooPanelContainer' },
    _debugSource: createSource(`${FOO_PLUGIN}/foo_layout.tsx`, 20),
  },
  {
    // rendered through a Route, whose own JSX yields a frame located in the router module
    type: { name: 'FooLayout' },
    _debugSource: createSource('src/platform/packages/shared/shared-ux/router/impl/route.tsx', 47),
  },
  {
    // the fourth frame of the foo plugin, beyond the closest frames and not a transition
    type: { name: 'Route' },
    _debugSource: createSource(`${FOO_PLUGIN}/application.tsx`, 30),
  },
  {
    type: { name: 'FooApp' },
    _debugSource: createSource('src/platform/plugins/shared/bar/public/shell.tsx', 12),
  },
  {
    type: { name: 'BarShell' },
    _debugSource: createSource(
      'src/platform/packages/shared/react/kibana_context/render/render_provider.tsx',
      50
    ),
  },
  { type: { name: 'KibanaRenderContextProvider' } },
]);

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

  it('should drop wrapper frames, collapse frames of one file and keep only module transitions beyond the closest frames', () => {
    const result = buildGrabContext({ element, fiber: fooAppFiber, repoRoot: REPO_ROOT });

    expect(result).toBe(
      [
        '<button class="euiButton" data-test-subj="saveButton">Save changes</button>',
        `  in SaveButton (${FOO_PLUGIN}/save_button.tsx:42:5)`,
        `  in FooPanel (${FOO_PLUGIN}/foo_panel.tsx:118:5)`,
        `  in FooLayout (${FOO_PLUGIN}/foo_layout.tsx:20:5)`,
        '  in BarShell (src/platform/plugins/shared/bar/public/shell.tsx:12:5)',
      ].join('\n')
    );
  });

  it('should keep absolute paths and the frames of every module without a repo root', () => {
    const result = buildGrabContext({ element, fiber: fooAppFiber });

    expect(result).toBe(
      [
        '<button class="euiButton" data-test-subj="saveButton">Save changes</button>',
        `  in SaveButton (${REPO_ROOT}${FOO_PLUGIN}/save_button.tsx:42:5)`,
        `  in FooPanel (${REPO_ROOT}${FOO_PLUGIN}/foo_panel.tsx:118:5)`,
        `  in FooLayout (${REPO_ROOT}${FOO_PLUGIN}/foo_layout.tsx:20:5)`,
        `  in FooApp (${REPO_ROOT}${FOO_PLUGIN}/application.tsx:30:5)`,
        `  in BarShell (${REPO_ROOT}src/platform/plugins/shared/bar/public/shell.tsx:12:5)`,
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
