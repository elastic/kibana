/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { snapshotComponentState, restoreComponentState } from './duplicate_helpers';

/**
 * Helper: render a React component into a container via createRoot (the same
 * mechanism used by renderEuiComponentLive) and return the container element.
 */
const renderIntoContainer = (element: React.ReactElement): HTMLElement => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  flushSync(() => {
    root.render(element);
  });
  return container;
};

/** Simple toggle component with a single useState. */
const Toggle = ({ initial = false }: { initial?: boolean }) => {
  const [on, setOn] = useState(initial);
  return (
    <button data-testid="toggle" onClick={() => setOn((v) => !v)}>
      {on ? 'ON' : 'OFF'}
    </button>
  );
};

/** Component with multiple useState hooks. */
const MultiState = () => {
  const [count, setCount] = useState(0);
  const [label, setLabel] = useState('hello');
  return (
    <div>
      <span data-testid="count">{count}</span>
      <span data-testid="label">{label}</span>
      <button data-testid="inc" onClick={() => setCount((n) => n + 1)} />
      <button data-testid="rename" onClick={() => setLabel('world')} />
    </div>
  );
};

describe('snapshotComponentState', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('returns undefined for a plain DOM element (no React root)', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    expect(snapshotComponentState(el)).toBeUndefined();
  });

  it('snapshots a single useState value', () => {
    const container = renderIntoContainer(<Toggle initial={false} />);
    const snapshot = snapshotComponentState(container);

    expect(snapshot).toBeDefined();
    expect(snapshot!.length).toBeGreaterThanOrEqual(1);
    // The Toggle component has one useState(false), so first component's
    // first hook value should be false.
    expect(snapshot![0]).toContain(false);
  });

  it('snapshots multiple useState values', () => {
    const container = renderIntoContainer(<MultiState />);
    const snapshot = snapshotComponentState(container);

    expect(snapshot).toBeDefined();
    // Should capture count=0 and label='hello' from the MultiState component
    const allValues = snapshot!.flat();
    expect(allValues).toContain(0);
    expect(allValues).toContain('hello');
  });

  it('captures changed state after user interaction', () => {
    const container = renderIntoContainer(<Toggle initial={false} />);

    // Simulate a state change
    const button = container.querySelector('[data-testid="toggle"]') as HTMLElement;
    flushSync(() => {
      button.click();
    });

    // Text should now be ON
    expect(button.textContent).toBe('ON');

    const snapshot = snapshotComponentState(container);
    expect(snapshot).toBeDefined();
    // The toggled value should now be true
    expect(snapshot![0]).toContain(true);
  });
});

describe('restoreComponentState', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('restores a differing state value', async () => {
    // Render source with state = true
    const source = renderIntoContainer(<Toggle initial={false} />);
    const sourceButton = source.querySelector('[data-testid="toggle"]') as HTMLElement;
    flushSync(() => {
      sourceButton.click();
    });
    expect(sourceButton.textContent).toBe('ON');

    // Snapshot the toggled state
    const snapshot = snapshotComponentState(source)!;
    expect(snapshot).toBeDefined();

    // Render a fresh target (starts with state = false)
    const target = renderIntoContainer(<Toggle initial={false} />);
    const targetButton = target.querySelector('[data-testid="toggle"]') as HTMLElement;
    expect(targetButton.textContent).toBe('OFF');

    // Restore the snapshot onto the target
    await restoreComponentState(target, snapshot);

    // Target should now show ON
    expect(targetButton.textContent).toBe('ON');
  });

  it('does nothing when snapshot matches current state', async () => {
    const container = renderIntoContainer(<Toggle initial={false} />);
    const snapshot = snapshotComponentState(container)!;

    // Render a second instance with the same initial state
    const target = renderIntoContainer(<Toggle initial={false} />);
    const targetButton = target.querySelector('[data-testid="toggle"]') as HTMLElement;
    expect(targetButton.textContent).toBe('OFF');

    await restoreComponentState(target, snapshot);

    // Should still be OFF (no change)
    expect(targetButton.textContent).toBe('OFF');
  });

  it('restores multiple hook values', async () => {
    // Render source and modify its state
    const source = renderIntoContainer(<MultiState />);
    const incButton = source.querySelector('[data-testid="inc"]') as HTMLElement;
    flushSync(() => {
      incButton.click();
      incButton.click();
      incButton.click();
    });

    expect(source.querySelector('[data-testid="count"]')!.textContent).toBe('3');

    const snapshot = snapshotComponentState(source)!;

    // Snapshot should capture values for all hooks in the component
    expect(snapshot).toBeDefined();
    expect(snapshot.length).toBeGreaterThanOrEqual(1);
    expect(snapshot[0].length).toBe(2); // count + label hooks

    // Render fresh target
    const target = renderIntoContainer(<MultiState />);
    expect(target.querySelector('[data-testid="count"]')!.textContent).toBe('0');

    await restoreComponentState(target, snapshot);

    // Count hook should be restored
    expect(target.querySelector('[data-testid="count"]')!.textContent).toBe('3');
  });

  it('suppresses transitions during restore', async () => {
    const source = renderIntoContainer(<Toggle initial={false} />);
    const sourceButton = source.querySelector('[data-testid="toggle"]') as HTMLElement;
    flushSync(() => {
      sourceButton.click();
    });
    const snapshot = snapshotComponentState(source)!;

    const target = renderIntoContainer(<Toggle initial={false} />);
    const targetButton = target.querySelector('[data-testid="toggle"]') as HTMLElement;
    targetButton.style.transition = 'opacity 300ms ease';

    await restoreComponentState(target, snapshot);

    // After restore, the original transition should be restored
    expect(targetButton.style.transition).toBe('opacity 300ms ease');
  });

  it('handles a non-React element gracefully', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);

    // Should not throw
    await restoreComponentState(el, [[true]]);
  });
});
