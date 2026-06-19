/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook } from '@testing-library/react';

import type { MenuItem } from '../../types';
import { useSidePanelVisibility } from './use_side_panel_visibility';

const openerNode = {
  id: 'security',
  label: 'Security',
  sections: [{ id: 'section', items: [{ id: 'overview', label: 'Overview' }] }],
} as MenuItem;

describe('useSidePanelVisibility', () => {
  it('does not render when the side panel is closed', () => {
    const { result } = renderHook(() => useSidePanelVisibility(false, openerNode));

    expect(result.current.isSidePanelRendered).toBe(false);
    expect(result.current.isSidePanelAnimating).toBe(false);
    expect(result.current.isSidePanelShown).toBe(false);
  });

  it('renders and starts enter animation when the side panel opens', () => {
    const { result } = renderHook(() => useSidePanelVisibility(true, openerNode));

    expect(result.current.isSidePanelRendered).toBe(true);
    expect(result.current.isSidePanelAnimating).toBe(true);
    expect(result.current.isSidePanelShown).toBe(true);
  });

  it('does not reset visibility when the opener node updates while open', () => {
    const otherOpenerNode = { ...openerNode, id: 'other', label: 'Other' } as MenuItem;
    const { result, rerender } = renderHook(
      ({ node }: { node: MenuItem }) => useSidePanelVisibility(true, node),
      { initialProps: { node: openerNode } }
    );

    act(() => {
      result.current.onSidePanelAnimationEnd();
    });

    expect(result.current.isSidePanelShown).toBe(true);
    expect(result.current.isSidePanelAnimating).toBe(false);

    rerender({ node: otherOpenerNode });

    expect(result.current.isSidePanelShown).toBe(true);
    expect(result.current.isSidePanelAnimating).toBe(false);
  });

  it('keeps rendering while exiting after the panel closes', () => {
    const { result, rerender } = renderHook(
      ({ isOpen }: { isOpen: boolean }) => useSidePanelVisibility(isOpen, openerNode),
      { initialProps: { isOpen: true } }
    );

    rerender({ isOpen: false });

    expect(result.current.isSidePanelRendered).toBe(true);
    expect(result.current.isSidePanelAnimating).toBe(true);
  });

  it('clears render state after the animation completes', () => {
    const { result, rerender } = renderHook(
      ({ isOpen }: { isOpen: boolean }) => useSidePanelVisibility(isOpen, openerNode),
      { initialProps: { isOpen: true } }
    );

    rerender({ isOpen: false });

    act(() => {
      result.current.onSidePanelAnimationEnd();
    });

    expect(result.current.isSidePanelRendered).toBe(false);
    expect(result.current.isSidePanelAnimating).toBe(false);
    expect(result.current.isSidePanelShown).toBe(false);
  });
});
