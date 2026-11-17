/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { DataReferencePicker } from './data_reference_picker';
import type { DataReferenceCatalog } from '../lib/build_data_reference_catalog';
import { formatDataReferenceToken } from '../lib/build_data_reference_catalog';

const makeItems = (prefix: string, count: number, originLabel: string) =>
  Array.from({ length: count }, (_, i) => ({
    path: `${prefix}.f${i}`,
    label: `f${i}`,
    subtitle: `${prefix}.f${i}`,
    typeLabel: 'string',
    drillable: false as const,
    originLabel,
  }));

const catalog: DataReferenceCatalog = {
  groups: [
    {
      id: 'triggers',
      title: 'Trigger event',
      description: "Data from this workflow's trigger.",
      items: makeItems('event', 7, 'Trigger · Manual'),
    },
    {
      id: 'steps',
      title: 'Steps',
      description: 'Prior steps',
      items: makeItems('steps.a.output', 3, 'Step · a'),
      emptyMessage: 'No earlier steps',
    },
    {
      id: 'context',
      title: 'Workflow context',
      description: 'Constants and runtime',
      items: makeItems('context', 2, 'Workflow context'),
    },
  ],
};

const renderOpen = () => {
  const onInsert = jest.fn();
  const onClose = jest.fn();
  render(
    <I18nProvider>
      <DataReferencePicker
        catalog={catalog}
        isOpen
        onClose={onClose}
        onInsert={onInsert}
        input={<input data-test-subj="anchor" />}
      />
    </I18nProvider>
  );
  return { onInsert, onClose };
};

describe('DataReferencePicker scaling', () => {
  it('caps root groups at 5 rows with Show all / Show fewer; search is uncapped', () => {
    renderOpen();

    const triggersGroup = screen.getByTestId('workflowDataReferenceGroup-triggers');
    expect(within(triggersGroup).getAllByTestId(/workflowDataReferenceRow-/)).toHaveLength(5);
    expect(screen.getByTestId('workflowDataReferenceShowAll-triggers')).toHaveTextContent(
      'Show all (7)'
    );

    const stepsGroup = screen.getByTestId('workflowDataReferenceGroup-steps');
    expect(within(stepsGroup).getAllByTestId(/workflowDataReferenceRow-/)).toHaveLength(3);
    expect(screen.queryByTestId('workflowDataReferenceShowAll-steps')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('workflowDataReferenceShowAll-triggers'));
    expect(within(triggersGroup).getAllByTestId(/workflowDataReferenceRow-/)).toHaveLength(7);
    expect(screen.getByTestId('workflowDataReferenceShowAll-triggers')).toHaveTextContent(
      'Show fewer'
    );

    fireEvent.click(screen.getByTestId('workflowDataReferenceShowAll-triggers'));
    expect(within(triggersGroup).getAllByTestId(/workflowDataReferenceRow-/)).toHaveLength(5);

    fireEvent.change(screen.getByTestId('workflowDataReferenceSearch'), {
      target: { value: 'event.f' },
    });
    // Search lists all matching leaves — no per-group cap.
    expect(screen.getAllByTestId(/workflowDataReferenceRow-event\.f/)).toHaveLength(7);
    expect(screen.queryByTestId('workflowDataReferenceShowAll-triggers')).not.toBeInTheDocument();
  });

  it('does not render jump-link chips', () => {
    renderOpen();
    expect(screen.queryByTestId('workflowDataReferenceJumpLinks')).not.toBeInTheDocument();
    expect(screen.queryByTestId('workflowDataReferenceJump-triggers')).not.toBeInTheDocument();
  });
});

describe('DataReferencePicker as a typeahead', () => {
  type KeyHandler = (event: { key: string; preventDefault: () => void }) => boolean;

  const renderTypeahead = (query: string, isOpen = true) => {
    const keyHandlerRef: { current: KeyHandler | null } = { current: null };
    const onInsert = jest.fn();
    const onClose = jest.fn();
    const element = (nextQuery: string) => (
      <I18nProvider>
        <DataReferencePicker
          catalog={catalog}
          isOpen={isOpen}
          onClose={onClose}
          onInsert={onInsert}
          typeahead={{ query: nextQuery, keyHandlerRef }}
          input={<input data-test-subj="anchor" />}
        />
      </I18nProvider>
    );
    const view = render(element(query));
    const press = (key: string) => {
      let used: boolean | undefined;
      // One key at a time, with a render in between, as the editor sends them.
      act(() => {
        used = keyHandlerRef.current?.({ key, preventDefault: jest.fn() });
      });
      return used;
    };
    return { onInsert, onClose, press, setQuery: (next: string) => view.rerender(element(next)) };
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('has no search box and leaves the focus where the user is typing', () => {
    renderTypeahead('');
    const anchor = screen.getByTestId('anchor');
    anchor.focus();

    act(() => {
      jest.advanceTimersByTime(50);
    });

    expect(screen.queryByTestId('workflowDataReferenceSearch')).not.toBeInTheDocument();
    expect(screen.getByTestId('workflowDataReferenceTypeahead')).toBeInTheDocument();
    expect(document.activeElement).toBe(anchor);
  });

  it('lists the references that match what was typed, and follows it as it changes', () => {
    const { setQuery } = renderTypeahead('f1');
    expect(screen.getAllByTestId(/workflowDataReferenceRow-/)).toHaveLength(3);

    setQuery('event.f1');
    expect(screen.getAllByTestId(/workflowDataReferenceRow-/)).toHaveLength(1);
  });

  it('hides itself when nothing matches, and comes back when something does', () => {
    const { setQuery } = renderTypeahead('zzz');
    expect(screen.queryByTestId('workflowDataReferenceTypeahead')).not.toBeInTheDocument();

    setQuery('f1');
    expect(screen.getByTestId('workflowDataReferenceTypeahead')).toBeInTheDocument();
  });

  describe('keys from the editor', () => {
    it('moves the highlight with the arrows and inserts the highlighted reference on Enter', () => {
      const { press, onInsert, onClose } = renderTypeahead('');

      expect(press('ArrowDown')).toBe(true);
      expect(press('Enter')).toBe(true);

      expect(onInsert).toHaveBeenCalledWith(formatDataReferenceToken('event.f1'));
      expect(onClose).toHaveBeenCalled();
    });

    it('inserts the first reference on Tab', () => {
      const { press, onInsert } = renderTypeahead('');

      expect(press('Tab')).toBe(true);

      expect(onInsert).toHaveBeenCalledWith(formatDataReferenceToken('event.f0'));
    });

    it('closes on Escape', () => {
      const { press, onClose, onInsert } = renderTypeahead('');

      expect(press('Escape')).toBe(true);

      expect(onClose).toHaveBeenCalled();
      expect(onInsert).not.toHaveBeenCalled();
    });

    it('leaves every other key to the editor', () => {
      const { press } = renderTypeahead('');

      expect(press('a')).toBe(false);
      expect(press('Backspace')).toBe(false);
      expect(press('ArrowLeft')).toBe(false);
    });

    it('leaves every key to the editor while the dropdown is not open, as in a multi-line editor', () => {
      const { press, onInsert, onClose } = renderTypeahead('', false);

      expect(press('Enter')).toBe(false);
      expect(press('Tab')).toBe(false);
      expect(press('ArrowDown')).toBe(false);
      expect(press('Escape')).toBe(false);
      expect(onInsert).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('leaves Enter and Tab to the editor when there is nothing to insert', () => {
      const { press, onInsert } = renderTypeahead('zzz');

      expect(press('Enter')).toBe(false);
      expect(press('Tab')).toBe(false);
      expect(onInsert).not.toHaveBeenCalled();
    });
  });

  it('does not take focus from the editor when a row is pressed', () => {
    renderTypeahead('');

    // A mousedown nobody cancels would move focus to the row and blur the editor.
    const focusMoves = fireEvent.mouseDown(screen.getByTestId('workflowDataReferenceRow-event.f0'));

    expect(focusMoves).toBe(false);
  });

  describe('placement', () => {
    // The popover places its panel from its own box, so that is what carries the position.
    const box = () => screen.getByTestId('workflowDataReferencePicker');

    const renderAt = (anchor?: { top: number; left: number }, fillHeight = false) =>
      render(
        <I18nProvider>
          <DataReferencePicker
            catalog={catalog}
            isOpen
            fillHeight={fillHeight}
            onClose={jest.fn()}
            onInsert={jest.fn()}
            typeahead={{ query: '', keyHandlerRef: { current: null }, anchor }}
            input={<textarea data-test-subj="anchor" />}
          />
        </I18nProvider>
      );

    it('opens under the text control, not over it', () => {
      renderAt();

      // The box spans the control, so its bottom edge is where the panel starts.
      expect(box()).toHaveStyle({ top: '0px', left: '0px', height: '100%' });
    });

    it('opens under the point it is given, which a multi-line editor measures at the cursor', () => {
      renderAt({ top: 68, left: 20 });

      // A box of no height there, so the panel starts at that point.
      expect(box()).toHaveStyle({ top: '68px', left: '20px', height: '0px' });
    });

    it('does not use the expanded editor being tall as a reason to open at its top', () => {
      renderAt({ top: 68, left: 20 }, true);

      expect(box()).toHaveStyle({ top: '68px', left: '20px', height: '0px' });
    });
  });

  it('inserts a reference when its row is clicked', () => {
    const { onInsert } = renderTypeahead('');

    fireEvent.click(screen.getByTestId('workflowDataReferenceRow-event.f2'));

    expect(onInsert).toHaveBeenCalledWith(formatDataReferenceToken('event.f2'));
  });
});
