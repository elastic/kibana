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
import { WorkflowGraphWireSplitControl } from './workflow_graph_wire_split_control';

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
    it('keeps a mid-wire control hidden and dashed at rest', () => {
      const { root, button } = renderControl();

      expect(root).toHaveStyle({ opacity: '0' });
      expect(button).toHaveStyle({ borderStyle: 'dashed' });
    });

    it('reveals a mid-wire control on hover and hides it again on leave', () => {
      const { root, button } = renderControl();

      fireEvent.mouseEnter(root);
      expect(root).toHaveStyle({ opacity: '1' });
      expect(button).toHaveStyle({ borderStyle: 'solid' });

      fireEvent.mouseLeave(root);
      expect(root).toHaveStyle({ opacity: '0' });
      expect(button).toHaveStyle({ borderStyle: 'dashed' });
    });

    it('reveals a mid-wire control when the button receives focus and hides it on blur', async () => {
      const user = userEvent.setup();
      const { root, button } = renderControl();

      await user.tab();
      expect(button).toHaveFocus();
      expect(root).toHaveStyle({ opacity: '1' });
      expect(button).toHaveStyle({ borderStyle: 'solid' });

      await user.tab();
      expect(button).not.toHaveFocus();
      expect(root).toHaveStyle({ opacity: '0' });
    });

    it('keeps a terminal control visible and dashed at rest, without any hover', () => {
      const { root, button } = renderControl(makeControl({ id: 'terminal:a', kind: 'terminal' }));

      expect(root).toHaveStyle({ opacity: '1' });
      expect(button).toHaveStyle({ borderStyle: 'dashed' });
    });

    it('keeps a terminal control dashed while hovered (only the button hover rule fills it)', () => {
      const { root, button } = renderControl(makeControl({ id: 'terminal:a', kind: 'terminal' }));

      fireEvent.mouseEnter(root);

      expect(root).toHaveStyle({ opacity: '1' });
      expect(button).toHaveStyle({ borderStyle: 'dashed' });
    });
  });

  describe('hover zone geometry', () => {
    it('spans the full segment length and a 44px strip across it for a vertical wire', () => {
      const { root } = renderControl();

      expect(root).toHaveStyle({ left: '78px', top: '100px', width: '44px', height: '100px' });
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

      expect(root).toHaveStyle({ left: '100px', top: '78px', width: '100px', height: '44px' });
      expect(root).toHaveAttribute('data-direction', 'LR');
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
