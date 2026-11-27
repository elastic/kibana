/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import type { WireInsertionControl } from './compute_wire_insertion_controls';
import type {
  WorkflowGraphEditActions,
  WorkflowGraphInsertionContext,
} from './workflow_graph_actions_context';
import {
  WIRE_HIT_FLOW_PX,
  WIRE_HIT_MIN_SCREEN_PX,
  WIRE_HIT_VAR,
  wireHitFlowPx,
  WorkflowGraphWireSplitControl,
} from './workflow_graph_wire_split_control';

const makeControl = (overrides: Partial<WireInsertionControl> = {}): WireInsertionControl => ({
  id: 'wire:a->b',
  kind: 'wire',
  centre: { x: 100, y: 150 },
  segmentStart: { x: 100, y: 100 },
  segmentEnd: { x: 100, y: 200 },
  insertContext: { mode: 'after', stepName: 'a' },
  direction: 'TB',
  ...overrides,
});

const makeEdit = (): jest.Mocked<WorkflowGraphEditActions> => ({
  onInsert: jest.fn(),
  onEditStep: jest.fn(),
  onDeleteNode: jest.fn(),
});

const renderControl = (control: WireInsertionControl = makeControl()) => {
  const edit = makeEdit();
  const utils = render(<WorkflowGraphWireSplitControl control={control} edit={edit} />);
  const root = screen.getByTestId(`workflowGraphWireControl-${control.kind}`);
  const button = screen.getByTestId('workflowGraphWireAddStep');
  return { ...utils, edit, root, button };
};

describe('WorkflowGraphWireSplitControl', () => {
  describe('reveal', () => {
    it('keeps a mid-wire control hidden at rest, with a solid border', () => {
      const { root, button } = renderControl();

      expect(root).toHaveStyle({ opacity: '0' });
      expect(button).toHaveStyle({ borderStyle: 'solid' });
    });

    it('reveals a mid-wire control on hover and hides it again on leave', () => {
      const { root, button } = renderControl();
      const restBorderColor = getComputedStyle(button).borderColor;

      fireEvent.mouseEnter(root);
      expect(root).toHaveStyle({ opacity: '1' });
      // Only hovering the button itself turns it primary (CSS :hover rule), not the wire.
      expect(button).toHaveStyle({ borderStyle: 'solid' });
      expect(getComputedStyle(button).borderColor).toBe(restBorderColor);

      fireEvent.mouseLeave(root);
      expect(root).toHaveStyle({ opacity: '0' });
      expect(button).toHaveStyle({ borderStyle: 'solid' });
    });

    it('reveals a mid-wire control when the button receives focus and hides it on blur', async () => {
      const user = userEvent.setup();
      const { root, button } = renderControl();
      const restBorderColor = getComputedStyle(button).borderColor;

      await user.tab();
      expect(button).toHaveFocus();
      expect(root).toHaveStyle({ opacity: '1' });
      // Keyboard focus on the button itself is the "primary" state (:focus-visible rule).
      expect(getComputedStyle(button).borderColor).not.toBe(restBorderColor);

      await user.tab();
      expect(button).not.toHaveFocus();
      expect(root).toHaveStyle({ opacity: '0' });
    });

    it('keeps a terminal control visible with a solid border at rest, without any hover', () => {
      const { root, button } = renderControl(makeControl({ id: 'terminal:a', kind: 'terminal' }));

      expect(root).toHaveStyle({ opacity: '1' });
      expect(button).toHaveStyle({ borderStyle: 'solid' });
    });

    it('keeps a terminal control unfilled while hovered (only the button hover rule fills it)', () => {
      const { root, button } = renderControl(makeControl({ id: 'terminal:a', kind: 'terminal' }));
      const restBorderColor = getComputedStyle(button).borderColor;

      fireEvent.mouseEnter(root);

      expect(root).toHaveStyle({ opacity: '1' });
      expect(getComputedStyle(button).borderColor).toBe(restBorderColor);
    });
  });

  describe('hover zone geometry', () => {
    // jsdom drops `var()` from inline styles and cannot resolve it, so the cross-axis size is
    // asserted on the generated rule instead (the live gate checks it in a real browser).
    const cssTextOf = (el: HTMLElement): string =>
      Array.from(document.styleSheets)
        .flatMap((sheet) => Array.from(sheet.cssRules))
        .filter(
          (rule): rule is CSSStyleRule =>
            rule instanceof CSSStyleRule &&
            rule.selectorText
              .split(',')
              .some((selector) => el.classList.contains(selector.slice(1)))
        )
        .map((rule) => rule.cssText.replace(/\s+/g, ''))
        .join('');
    const hitSize = `var(${WIRE_HIT_VAR},${WIRE_HIT_FLOW_PX}px)`;

    it('spans the full segment length, centred on the wire, with a zoom-aware strip across it', () => {
      const { root } = renderControl();

      expect(root).toHaveStyle({ left: '100px', top: '100px', height: '100px' });
      expect(cssTextOf(root)).toContain(`width:${hitSize}`);
      expect(cssTextOf(root)).toContain('translateX(-50%)');
    });

    it('swaps the axes for a horizontal (LR) wire', () => {
      const { root } = renderControl(
        makeControl({
          direction: 'LR',
          centre: { x: 150, y: 100 },
          segmentStart: { x: 100, y: 100 },
          segmentEnd: { x: 200, y: 100 },
        })
      );

      expect(root).toHaveStyle({ left: '100px', top: '100px', width: '100px' });
      expect(cssTextOf(root)).toContain(`height:${hitSize}`);
      expect(cssTextOf(root)).toContain('translateY(-50%)');
      expect(root).toHaveAttribute('data-direction', 'LR');
    });

    it('keeps the button on the control centre when it is off the strip midline', () => {
      const { button } = renderControl(
        makeControl({
          centre: { x: 130, y: 120 },
          segmentStart: { x: 100, y: 100 },
          segmentEnd: { x: 100, y: 200 },
        })
      );

      // Cross-axis offset from the strip's own x (100) is +30; main axis is 20 below its start.
      const placement = button.closest('div') as HTMLElement;
      expect(placement).toHaveStyle({ marginLeft: '30px', top: '20px' });
      expect(cssTextOf(placement)).toContain('left:50%');
    });
  });

  describe('wireHitFlowPx', () => {
    it('keeps the 44 flow px strip while it is already at least the screen floor wide', () => {
      expect(wireHitFlowPx(1)).toBe(WIRE_HIT_FLOW_PX);
      expect(wireHitFlowPx(0.6)).toBe(WIRE_HIT_FLOW_PX);
    });

    it('widens the strip so it stays at least the screen floor wide when zoomed out', () => {
      [0.5, 0.4, 0.2, 0.1].forEach((zoom) => {
        expect(wireHitFlowPx(zoom)).toBeGreaterThan(WIRE_HIT_FLOW_PX);
        expect(wireHitFlowPx(zoom) * zoom).toBeGreaterThanOrEqual(WIRE_HIT_MIN_SCREEN_PX - 1e-9);
      });
    });

    it('falls back to the flow size for a non-positive or non-finite zoom', () => {
      expect(wireHitFlowPx(0)).toBe(WIRE_HIT_FLOW_PX);
      expect(wireHitFlowPx(Number.NaN)).toBe(WIRE_HIT_FLOW_PX);
    });
  });

  describe('insert context', () => {
    it.each<[string, WorkflowGraphInsertionContext]>([
      ['after', { mode: 'after', stepName: 'fetch_data' }],
      [
        'branch',
        { mode: 'branch', stepName: 'check', branch: { kind: 'else' }, position: 'start' },
      ],
      ['prepend-step', { mode: 'prepend-step' }],
      ['fallback', { mode: 'fallback', stepName: 'fetch_data' }],
    ])('serialises the %s insert context onto data-insert-context', (_label, insertContext) => {
      const { root } = renderControl(makeControl({ insertContext }));

      expect(JSON.parse(root.getAttribute('data-insert-context') ?? '')).toEqual(insertContext);
    });

    it('exposes the control id and kind for tests and tooling', () => {
      const { root } = renderControl(makeControl({ id: 'wire:x->y' }));

      expect(root).toHaveAttribute('data-control-id', 'wire:x->y');
    });
  });

  describe('activation', () => {
    it('calls onInsert once with the control insert context and the button rect on click', () => {
      const insertContext: WorkflowGraphInsertionContext = {
        mode: 'branch',
        stepName: 'check',
        branch: { kind: 'steps' },
        position: 'start',
      };
      const { edit, button } = renderControl(makeControl({ insertContext }));
      jest.spyOn(button, 'getBoundingClientRect').mockReturnValue({
        left: 10,
        top: 20,
        width: 24,
        height: 24,
        x: 10,
        y: 20,
        right: 34,
        bottom: 44,
        toJSON: () => ({}),
      });

      fireEvent.click(button);

      expect(edit.onInsert).toHaveBeenCalledTimes(1);
      expect(edit.onInsert).toHaveBeenCalledWith(insertContext, {
        left: 10,
        top: 20,
        width: 24,
        height: 24,
      });
    });

    it('is a native button so Enter and Space activate it from the keyboard', async () => {
      const user = userEvent.setup();
      const { edit, button } = renderControl();
      expect(button.tagName).toBe('BUTTON');
      expect(button).toHaveAttribute('type', 'button');
      expect(button).toHaveAccessibleName('Add step');

      await user.tab();
      await user.keyboard('{Enter}');
      expect(edit.onInsert).toHaveBeenCalledTimes(1);

      await user.keyboard(' ');
      expect(edit.onInsert).toHaveBeenCalledTimes(2);
      expect(edit.onInsert).toHaveBeenLastCalledWith(
        { mode: 'after', stepName: 'a' },
        expect.objectContaining({ width: expect.any(Number) })
      );
    });

    it('does not insert on hover or focus alone', async () => {
      const user = userEvent.setup();
      const { edit, root } = renderControl();

      fireEvent.mouseEnter(root);
      await user.tab();

      expect(edit.onInsert).not.toHaveBeenCalled();
    });
  });
});
