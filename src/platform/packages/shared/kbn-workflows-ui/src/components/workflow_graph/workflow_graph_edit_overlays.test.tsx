/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import type { WireInsertionControl } from './compute_wire_insertion_controls';
import { WorkflowGraphEditOverlays } from './workflow_graph_edit_overlays';

const mockTerminalControl: WireInsertionControl = {
  id: 'terminal:a',
  kind: 'terminal',
  centre: { x: 100, y: 200 },
  segmentStart: { x: 100, y: 100 },
  segmentEnd: { x: 100, y: 200 },
  insertContext: { mode: 'after', stepName: 'a' },
  direction: 'TB',
};

jest.mock('./compute_wire_insertion_controls', () => ({
  ...jest.requireActual('./compute_wire_insertion_controls'),
  computeWireInsertionControls: () => [mockTerminalControl],
}));

// EUI's jest build returns a constant id from `useGeneratedHtmlId`; hand every
// mounted instance its own id (stable across re-renders) so that a hard-coded
// marker id, or one that is not referenced consistently, becomes observable.
let mockGeneratedIdCounter = 0;
jest.mock('@elastic/eui', () => {
  const { useState } = jest.requireActual('react');
  const useGeneratedHtmlId = ({ prefix = '' }: { prefix?: string } = {}): string => {
    const [id] = useState(() => `${prefix}_${++mockGeneratedIdCounter}`);
    return id;
  };
  return { ...jest.requireActual('@elastic/eui'), useGeneratedHtmlId };
});

let mockZoom = 1;
jest.mock('@xyflow/react', () => ({
  ...jest.requireActual('@xyflow/react'),
  ViewportPortal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useStore: (selector: (state: { transform: [number, number, number] }) => unknown) =>
    selector({ transform: [0, 0, mockZoom] }),
}));

const renderOverlays = () =>
  render(
    <I18nProvider>
      <WorkflowGraphEditOverlays
        nodes={[]}
        edges={[]}
        insertionPoints={{ byNodeId: new Map(), topLevelStepNodeIds: [] }}
        direction="TB"
        edit={{ onInsert: jest.fn(), onEditStep: jest.fn(), onDeleteNode: jest.fn() }}
      />
    </I18nProvider>
  );

describe('WorkflowGraphEditOverlays terminal stubs', () => {
  it('gives each canvas its own arrow marker id so two mounted canvases never collide', () => {
    renderOverlays();
    renderOverlays();

    const stubSvgs = screen.getAllByTestId('workflowGraphTerminalStubs');
    expect(stubSvgs).toHaveLength(2);

    const markerIds = stubSvgs.map((svg) => svg.querySelector('marker')?.id);
    expect(markerIds[0]).toBeTruthy();
    expect(markerIds[1]).toBeTruthy();
    expect(markerIds[0]).not.toBe(markerIds[1]);

    stubSvgs.forEach((svg, index) => {
      expect(svg.querySelector('line')).toHaveAttribute('marker-end', `url(#${markerIds[index]})`);
    });
  });
});

describe('WorkflowGraphEditOverlays wire hit size', () => {
  afterEach(() => {
    mockZoom = 1;
  });

  it('scopes the strip size to the canvas zoom through a CSS variable', () => {
    renderOverlays();

    const scope = screen.getByTestId('workflowGraphWireHitScope');
    expect(scope.style.getPropertyValue('--workflowGraphWireHit')).toBe('44px');
  });

  it('widens the strip in flow space when zoomed out so it keeps a usable screen size', () => {
    mockZoom = 0.2;
    renderOverlays();

    const scope = screen.getByTestId('workflowGraphWireHitScope');
    // 24 screen px / 0.2 zoom = 120 flow px.
    expect(scope.style.getPropertyValue('--workflowGraphWireHit')).toBe('120px');
  });

  it('renders every wire control inside the scope', () => {
    renderOverlays();

    const scope = screen.getByTestId('workflowGraphWireHitScope');
    expect(scope).toContainElement(screen.getByTestId('workflowGraphWireControl-terminal'));
  });
});
