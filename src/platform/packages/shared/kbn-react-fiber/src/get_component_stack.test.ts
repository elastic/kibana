/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getComponentStack } from './get_component_stack';
import type { DebugSource, ReactFiberNode } from './types';

const createSource = (fileName: string, lineNumber: number): DebugSource => ({
  fileName,
  lineNumber,
  columnNumber: 5,
});

// Functions passed inline, e.g. to `memo`, have no name unlike the ones assigned to a variable
const createAnonymousComponent = () => () => null;

describe('getComponentStack', () => {
  it('should pair each sourced fiber with the closest application component above it', () => {
    const app: ReactFiberNode = { type: { name: 'App' } };
    const panel: ReactFiberNode = {
      type: { name: 'Panel' },
      _debugSource: createSource('application.tsx', 30),
      _debugOwner: app,
    };
    const saveButton: ReactFiberNode = {
      type: { name: 'SaveButton' },
      _debugSource: createSource('panel.tsx', 118),
      _debugOwner: panel,
    };
    const euiButton: ReactFiberNode = {
      type: { displayName: 'EuiButton' },
      _debugSource: createSource('save_button.tsx', 42),
      _debugOwner: saveButton,
    };

    expect(getComponentStack(euiButton)).toEqual([
      { name: 'SaveButton', source: createSource('save_button.tsx', 42) },
      { name: 'Panel', source: createSource('panel.tsx', 118) },
      { name: 'App', source: createSource('application.tsx', 30) },
    ]);
  });

  it('should skip fibers without source and name frames after the closest non-EUI owner', () => {
    const table: ReactFiberNode = { type: { name: 'MyTable' } };
    const euiTable: ReactFiberNode = {
      type: { displayName: 'EuiInMemoryTable' },
      _debugOwner: table,
    };
    const euiCell: ReactFiberNode = {
      type: { displayName: 'EuiTableRowCell' },
      _debugOwner: euiTable,
    };
    const cell: ReactFiberNode = {
      type: { name: 'MyCell' },
      _debugSource: createSource('my_table.tsx', 55),
      _debugOwner: euiCell,
    };

    expect(getComponentStack(cell)).toEqual([
      { name: 'MyTable', source: createSource('my_table.tsx', 55) },
    ]);
  });

  it('should report unnamed components as Anonymous instead of a component further up', () => {
    const app: ReactFiberNode = { type: { name: 'App' } };
    const layout: ReactFiberNode = {
      type: { type: createAnonymousComponent() },
      _debugSource: createSource('application.tsx', 30),
      _debugOwner: app,
    };
    const header: ReactFiberNode = {
      type: { name: 'Header' },
      _debugSource: createSource('layout.tsx', 116),
      _debugOwner: layout,
    };

    expect(getComponentStack(header)).toEqual([
      { name: 'Anonymous', source: createSource('layout.tsx', 116) },
      { name: 'App', source: createSource('application.tsx', 30) },
    ]);
  });

  it('should report JSX created outside of a render as Anonymous instead of its tree parent', () => {
    const sidebarProvider: ReactFiberNode = { type: { name: 'SidebarProvider' } };
    // a context provider is neither a component nor a frame owner
    const contextProvider: ReactFiberNode = {
      type: {},
      _debugSource: createSource('sidebar_provider.tsx', 27),
      _debugOwner: sidebarProvider,
    };
    const layout: ReactFiberNode = {
      type: { name: 'Layout' },
      _debugSource: createSource('rendering_service.tsx', 106),
      _debugOwner: null,
      return: contextProvider,
    };

    expect(getComponentStack(layout)).toEqual([
      { name: 'Anonymous', source: createSource('rendering_service.tsx', 106) },
      { name: 'SidebarProvider', source: createSource('sidebar_provider.tsx', 27) },
    ]);
  });
});
