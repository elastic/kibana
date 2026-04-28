/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';
import { EuiCode, EuiProvider, EuiSpacer, EuiText } from '@elastic/eui';

import { GridLayout } from '../../..';
import type { GridLayoutData, GridSettings } from '../../..';

const GRID_SETTINGS: GridSettings = {
  gutterSize: 8,
  rowHeight: 64,
  columnCount: 48,
  keyboardDragTopLimit: 0,
};

const INITIAL_LAYOUT: GridLayoutData = {
  panel1: {
    type: 'panel',
    id: 'panel1',
    column: 0,
    row: 0,
    width: 24,
    height: 3,
  },
  panel2: {
    type: 'panel',
    id: 'panel2',
    column: 24,
    row: 0,
    width: 24,
    height: 3,
  },
  panel3: {
    type: 'panel',
    id: 'panel3',
    column: 0,
    row: 3,
    width: 48,
    height: 4,
  },
};

const App = () => {
  const [layout, setLayout] = useState<GridLayoutData>(INITIAL_LAYOUT);
  const [accessMode, setAccessMode] = useState<'EDIT' | 'VIEW'>('EDIT');

  const handleLayoutChange = useCallback((newLayout: GridLayoutData) => {
    setLayout(newLayout);
  }, []);

  const renderPanelContents = useCallback((panelId: string) => {
    return (
      <div
        style={{
          height: '100%',
          padding: '8px',
          background: '#f5f7fa',
          border: '1px solid #d3dae6',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <EuiText size="s">
          <EuiCode>{panelId}</EuiCode>
        </EuiText>
      </div>
    );
  }, []);

  return (
    <EuiProvider colorMode="light">
      <div style={{ padding: '24px' }}>
        <EuiText>
          <h1>
            <EuiCode>GridLayout</EuiCode> Example
          </h1>
          <p>
            Access mode: <EuiCode>{accessMode}</EuiCode>{' '}
            <button onClick={() => setAccessMode((m) => (m === 'EDIT' ? 'VIEW' : 'EDIT'))}>
              Toggle
            </button>
          </p>
          <p>Panel count: {Object.keys(layout).length}</p>
        </EuiText>

        <EuiSpacer size="m" />

        <GridLayout
          layout={layout}
          gridSettings={GRID_SETTINGS}
          onLayoutChange={handleLayoutChange}
          accessMode={accessMode}
          renderPanelContents={renderPanelContents}
        />

        <EuiSpacer size="xl" />

        <EuiText>
          <h2>Test cases</h2>
          <ul>
            <li>Drag panels to reorder — layout state updates above.</li>
            <li>Resize panels using the resize handle (bottom-right corner).</li>
            <li>Toggle access mode to VIEW — drag/resize handles disappear.</li>
            <li>Use keyboard: focus a drag handle, then arrow keys to move.</li>
          </ul>
        </EuiText>
      </div>
    </EuiProvider>
  );
};

// eslint-disable-next-line import/no-default-export
export default App;
