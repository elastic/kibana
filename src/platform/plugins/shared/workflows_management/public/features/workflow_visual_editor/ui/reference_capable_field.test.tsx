/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import React, { useEffect, useState } from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import type {
  EditorEvents,
  ReferenceCapableBind,
  ReferenceSelectionBridge,
} from './reference_capable_field';
import { ReferenceCapableField } from './reference_capable_field';
import { typedCharacterOfInput } from './use_reference_editor';
import type { DataReferenceCatalog } from '../lib/build_data_reference_catalog';

jest.mock('./data_reference_picker', () => ({
  DataReferencePicker: ({
    isOpen,
    onInsert,
    onClose,
    input,
    typeahead,
  }: {
    isOpen: boolean;
    onInsert: (token: string) => void;
    onClose: () => void;
    input: React.ReactElement;
    typeahead: {
      query: string;
      anchor?: { top: number; left: number };
      keyHandlerRef: {
        current: ((event: { key: string; preventDefault: () => void }) => boolean) | null;
      };
    };
  }) => {
    // What the real picker does with the keys: Escape closes, Enter inserts, the rest is the editor's.
    const { keyHandlerRef } = typeahead;
    useEffect(() => {
      keyHandlerRef.current = (event) => {
        if (event.key === 'Escape') {
          onClose();
          return true;
        }
        if (event.key === 'Enter') {
          onInsert('{{ event.a }}');
          return true;
        }
        return false;
      };
      return () => {
        keyHandlerRef.current = null;
      };
    });
    return (
      <div>
        {input}
        {isOpen ? (
          <div
            data-test-subj="mockTypeahead"
            data-query={typeahead.query}
            data-anchor={typeahead.anchor ? `${typeahead.anchor.top},${typeahead.anchor.left}` : ''}
          >
            <button
              type="button"
              data-test-subj="mockInsert"
              onClick={() => onInsert('{{ event.a }}')}
            >
              {'insert'}
            </button>
          </div>
        ) : null}
      </div>
    );
  },
}));

const catalog: DataReferenceCatalog = { groups: [] };

/** A plain input host, like the one in the workflow settings flyout. */
function Harness({
  initialValue = 'hello',
  valueFormWhenWhole,
  openOnBrace,
  onBind,
}: {
  initialValue?: string;
  valueFormWhenWhole?: boolean;
  openOnBrace?: boolean;
  onBind?: (bind: ReferenceCapableBind) => void;
}) {
  const [value, setValue] = useState(initialValue);
  return (
    <I18nProvider>
      <ReferenceCapableField
        catalog={catalog}
        value={value}
        onChange={setValue}
        valueFormWhenWhole={valueFormWhenWhole}
        openOnBrace={openOnBrace}
      >
        {(bind) => {
          onBind?.(bind);
          return (
            <>
              <span data-test-subj="placeholder">{bind.teachingPlaceholder}</span>
              <input
                data-test-subj="field"
                value={bind.value}
                ref={bind.attachInputRef}
                onKeyDown={bind.handleTypeaheadKey}
                onChange={(e) =>
                  bind.reportChange(
                    e.target.value,
                    e.target.selectionStart ?? e.target.value.length,
                    typedCharacterOfInput(e)
                  )
                }
              />
              {bind.appendControls}
            </>
          );
        }}
      </ReferenceCapableField>
    </I18nProvider>
  );
}

const field = () => screen.getByTestId('field') as HTMLInputElement;
const typeahead = () => screen.queryByTestId('mockTypeahead');
const query = () => screen.getByTestId('mockTypeahead').getAttribute('data-query');
const button = () => screen.getByLabelText('Insert data from a prior step');

/** The user types `typed`, leaving the text as `text` with the caret `caret` (default: the end). */
const typeInto = (text: string, typed: string, caret = text.length) =>
  fireEvent.input(field(), {
    target: { value: text, selectionStart: caret },
    inputType: 'insertText',
    data: typed,
  });

/** The text becomes `text` without typing: a deletion, a paste, an undo. */
const changeTo = (text: string, inputType: string) =>
  fireEvent.input(field(), { target: { value: text, selectionStart: text.length }, inputType });

const press = (key: string) => fireEvent.keyDown(field(), { key });

/** A browser without undo history: inserts fall back to setting the value, which these tests read. */
const withoutExecCommand = () =>
  Object.defineProperty(document, 'execCommand', { configurable: true, value: () => false });

describe('ReferenceCapableField insert undo', () => {
  it('inserts via execCommand so the browser undo stack can revert it', () => {
    const execCommand = jest.fn().mockReturnValue(true);
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand,
    });
    render(<Harness />);

    field().focus();
    field().setSelectionRange(5, 5);

    fireEvent.click(button());
    fireEvent.click(screen.getByTestId('mockInsert'));

    expect(execCommand).toHaveBeenCalledWith('insertText', false, '{{ event.a }}');
  });
});

describe('ReferenceCapableField value form when the pick fills the field', () => {
  const insertedText = (initialValue: string, caret: number, valueFormWhenWhole?: boolean) => {
    const execCommand = jest.fn().mockReturnValue(true);
    Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand });
    render(<Harness initialValue={initialValue} valueFormWhenWhole={valueFormWhenWhole} />);
    field().focus();
    field().setSelectionRange(caret, caret);
    fireEvent.click(button());
    fireEvent.click(screen.getByTestId('mockInsert'));
    return execCommand.mock.calls[0]?.[2];
  };

  it('writes a whole reference as a value into an empty field', () => {
    expect(insertedText('', 0, true)).toBe('${{ event.a }}');
  });

  it('treats a field with only spaces as empty', () => {
    expect(insertedText('  ', 1, true)).toBe('${{ event.a }}');
  });

  it('keeps the text form when the field already holds text', () => {
    expect(insertedText('status : ', 9, true)).toBe('{{ event.a }}');
  });

  it('keeps the text form when the option is off', () => {
    expect(insertedText('', 0)).toBe('{{ event.a }}');
  });
});

describe('ReferenceCapableField typeahead', () => {
  beforeEach(withoutExecCommand);

  describe('opening', () => {
    it('opens under a typed {{', () => {
      render(<Harness initialValue="" />);
      typeInto('{', '{');
      expect(typeahead()).not.toBeInTheDocument();

      typeInto('{{', '{');

      expect(query()).toBe('');
    });

    it('opens under a single typed { only where { is not syntax', () => {
      const { unmount } = render(<Harness initialValue="" openOnBrace />);
      typeInto('{', '{');
      expect(typeahead()).toBeInTheDocument();
      unmount();

      render(<Harness initialValue="" />);
      typeInto('{', '{');
      expect(typeahead()).not.toBeInTheDocument();
    });

    it('does not open under a typed @', () => {
      render(<Harness initialValue="" openOnBrace />);
      typeInto('mail @', '@');
      expect(typeahead()).not.toBeInTheDocument();
    });

    it('does not open when {{ is pasted in', () => {
      render(<Harness initialValue="" openOnBrace />);
      changeTo('{{', 'insertFromPaste');
      expect(typeahead()).not.toBeInTheDocument();
    });

    it('teaches { for plain text and {{ elsewhere', () => {
      const { unmount } = render(<Harness openOnBrace />);
      expect(screen.getByTestId('placeholder')).toHaveTextContent('Type { to insert data');
      unmount();

      render(<Harness />);
      expect(screen.getByTestId('placeholder')).toHaveTextContent('Type {{ to insert data');
    });
  });

  describe('while the variable is typed', () => {
    it('filters by what follows the trigger, and the field keeps the text', () => {
      render(<Harness initialValue="" />);
      typeInto('{{', '{');
      typeInto('{{ a', 'a');
      typeInto('{{ aa', 'a');

      expect(query()).toBe('aa');
      expect(field()).toHaveValue('{{ aa');
    });

    it('does not open a second time for the second brace of {{', () => {
      render(<Harness initialValue="" openOnBrace />);
      typeInto('{', '{');
      const dropdown = typeahead();

      typeInto('{{', '{');

      expect(typeahead()).toBe(dropdown);
      expect(query()).toBe('');
    });

    it('goes on while characters after the trigger are deleted', () => {
      render(<Harness initialValue="" />);
      typeInto('{{', '{');
      typeInto('{{ a', 'a');

      changeTo('{{ ', 'deleteContentBackward');
      changeTo('{{', 'deleteContentBackward');

      expect(query()).toBe('');
    });

    it('closes when the trigger itself is deleted', () => {
      render(<Harness initialValue="" />);
      typeInto('{{', '{');

      changeTo('{', 'deleteContentBackward');

      expect(typeahead()).not.toBeInTheDocument();
    });

    it('closes when the reference is closed', () => {
      render(<Harness initialValue="" />);
      typeInto('{{', '{');
      typeInto('{{ a }', '}');

      expect(typeahead()).not.toBeInTheDocument();
    });
  });

  describe('deleting back to {{', () => {
    it('does not bring the dropdown back', () => {
      render(<Harness initialValue="{{a" />);

      changeTo('{{', 'deleteContentBackward');

      expect(typeahead()).not.toBeInTheDocument();
    });

    it('does not bring it back after Escape either', () => {
      render(<Harness initialValue="" />);
      typeInto('{{', '{');
      typeInto('{{a', 'a');
      press('Escape');
      expect(typeahead()).not.toBeInTheDocument();

      changeTo('{{', 'deleteContentBackward');

      expect(typeahead()).not.toBeInTheDocument();
    });
  });

  describe('keys', () => {
    it('hands the keys to the dropdown while it is open, and Escape closes it', () => {
      render(<Harness initialValue="" />);
      typeInto('{{', '{');

      press('Escape');

      expect(typeahead()).not.toBeInTheDocument();
    });

    it('does not reopen while typing goes on after Escape', () => {
      render(<Harness initialValue="" />);
      typeInto('{{', '{');
      press('Escape');

      typeInto('{{a', 'a');
      typeInto('{{ab', 'b');

      expect(typeahead()).not.toBeInTheDocument();
    });

    it('opens again when a new {{ is typed', () => {
      render(<Harness initialValue="" />);
      typeInto('{{', '{');
      press('Escape');

      typeInto('{{ {', '{');
      typeInto('{{ {{', '{');

      expect(typeahead()).toBeInTheDocument();
    });
  });

  describe('picking', () => {
    it('replaces the trigger and what was typed after it', () => {
      render(<Harness initialValue="Hi " />);
      typeInto('Hi {{', '{');
      typeInto('Hi {{ ev', 'v');

      press('Enter');

      expect(field()).toHaveValue('Hi {{ event.a }}');
      expect(typeahead()).not.toBeInTheDocument();
    });

    it('keeps the text after the caret, and takes a closing }} that follows it', () => {
      render(<Harness initialValue="" />);
      typeInto('{{', '{');
      typeInto('{{ ev }} rest', 'v', 5);

      press('Enter');

      expect(field()).toHaveValue('{{ event.a }} rest');
    });

    it('replaces a single { in a text field too', () => {
      render(<Harness initialValue="Hi " openOnBrace />);
      typeInto('Hi {', '{');

      fireEvent.click(screen.getByTestId('mockInsert'));

      expect(field()).toHaveValue('Hi {{ event.a }}');
    });
  });

  describe('the insert button', () => {
    it('opens the dropdown at the caret and closes it when pressed again', () => {
      render(<Harness initialValue="status: " />);
      field().focus();
      field().setSelectionRange(8, 8);

      fireEvent.click(button());
      expect(query()).toBe('');

      fireEvent.click(button());
      expect(typeahead()).not.toBeInTheDocument();
    });

    it('filters by what is typed after it, and a pick replaces that', () => {
      render(<Harness initialValue="status: " />);
      field().focus();
      field().setSelectionRange(8, 8);
      fireEvent.click(button());

      typeInto('status: ev', 'v');
      expect(query()).toBe('ev');
      press('Enter');

      expect(field()).toHaveValue('status: {{ event.a }}');
    });

    it('does not take the focus from the field when it is pressed', () => {
      render(<Harness />);

      // A mousedown nobody cancels would move focus to the button and blur the field.
      const focusMoves = fireEvent.mouseDown(button());

      expect(focusMoves).toBe(false);
    });
  });
});

describe('ReferenceCapableField with a Monaco editor', () => {
  beforeEach(withoutExecCommand);

  const setup = () => {
    let bind: ReferenceCapableBind | undefined;
    let events: EditorEvents | undefined;
    const stopListening = jest.fn();
    const bridge: ReferenceSelectionBridge = {
      focus: jest.fn(),
      getCaret: () => 2,
      setCaret: jest.fn(),
      listen: (handlers) => {
        events = handlers;
        return stopListening;
      },
    };
    render(
      <I18nProvider>
        <ReferenceCapableField catalog={catalog} value="{{ a" onChange={jest.fn()}>
          {(next) => {
            bind = next;
            return <span />;
          }}
        </ReferenceCapableField>
      </I18nProvider>
    );
    return {
      bind: () => bind as ReferenceCapableBind,
      events: () => events as EditorEvents,
      stopListening,
      bridge,
      act,
    };
  };

  it('listens to the editor once it is registered, and stops when it goes away', () => {
    const host = setup();

    host.act(() => host.bind().registerSelection(host.bridge));
    expect(host.events()).toBeDefined();

    host.act(() => host.bind().registerSelection(null));
    expect(host.stopListening).toHaveBeenCalledTimes(1);
  });

  it('closes the dropdown when the editor it was open in goes away', () => {
    const host = setup();
    host.act(() => host.bind().registerSelection(host.bridge));
    host.act(() => host.bind().togglePicker());
    expect(typeahead()).toBeInTheDocument();

    host.act(() => host.bind().registerSelection(null));

    expect(typeahead()).not.toBeInTheDocument();
  });

  it('keeps the keys the dropdown uses from the editor', () => {
    const host = setup();
    host.act(() => host.bind().registerSelection(host.bridge));
    host.act(() => host.bind().togglePicker());
    const stopPropagation = jest.fn();

    host.act(() =>
      host.events().onKeyDown({ key: 'Escape', preventDefault: jest.fn(), stopPropagation })
    );

    expect(stopPropagation).toHaveBeenCalled();
    expect(typeahead()).not.toBeInTheDocument();
  });

  it('leaves the other keys to the editor', () => {
    const host = setup();
    host.act(() => host.bind().registerSelection(host.bridge));
    host.act(() => host.bind().togglePicker());
    const stopPropagation = jest.fn();

    host.act(() =>
      host.events().onKeyDown({ key: 'a', preventDefault: jest.fn(), stopPropagation })
    );

    expect(stopPropagation).not.toHaveBeenCalled();
    expect(typeahead()).toBeInTheDocument();
  });

  it('closes when the caret moves before the trigger, and not when it moves within the reference', () => {
    const host = setup();
    host.act(() => host.bind().registerSelection(host.bridge));
    host.act(() => host.bind().togglePicker());

    host.act(() => host.events().onCaretChange(3));
    expect(typeahead()).toBeInTheDocument();

    host.act(() => host.events().onCaretChange(0));
    expect(typeahead()).not.toBeInTheDocument();
  });

  it('closes when the editor loses focus', () => {
    const host = setup();
    host.act(() => host.bind().registerSelection(host.bridge));
    host.act(() => host.bind().togglePicker());

    host.act(() => host.events().onBlur());

    expect(typeahead()).not.toBeInTheDocument();
  });

  it('asks a host that shows text for an editor, and opens once it has one', () => {
    const host = setup();
    const requestEdit = jest.fn();
    host.act(() => host.bind().registerEditRequester(requestEdit));

    host.act(() => host.bind().togglePicker());

    expect(requestEdit).toHaveBeenCalledTimes(1);
    expect(typeahead()).not.toBeInTheDocument();

    host.act(() => host.bind().registerSelection(host.bridge));
    expect(typeahead()).toBeInTheDocument();
  });

  it('opens over an existing reference to swap it, and closes on the first edit', () => {
    const host = setup();
    host.act(() => host.bind().registerSelection(host.bridge));

    host.act(() => host.bind().openPickerAtRange(0, 4));
    expect(query()).toBe('');

    host.act(() => host.bind().reportChange('x', 1, 'x'));
    expect(typeahead()).not.toBeInTheDocument();
  });
});

describe('ReferenceCapableField dropdown placement', () => {
  /** The editor draws offset `n` at x = 10 * n, on line 3 (y = 54), 18px tall; the field starts at 100,150. */
  const getCaretRect = jest.fn((offset: number) => ({
    top: 150 + 54,
    left: 100 + 10 * offset,
    height: 18,
  }));
  const bridge: ReferenceSelectionBridge = {
    focus: jest.fn(),
    getCaret: () => 5,
    setCaret: jest.fn(),
    getCaretRect,
  };
  let rectSpy: jest.SpyInstance;

  beforeEach(() => {
    withoutExecCommand();
    getCaretRect.mockClear();
    rectSpy = jest
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function mockRect(this: HTMLElement) {
        const isField = (this.getAttribute('data-test-subj') ?? '').endsWith('DropTarget');
        return { top: isField ? 150 : 0, left: isField ? 100 : 0 } as DOMRect;
      });
  });
  afterEach(() => rectSpy.mockRestore());

  const setup = (anchorAtCaret?: boolean) => {
    let bind: ReferenceCapableBind | undefined;
    render(
      <I18nProvider>
        <ReferenceCapableField
          catalog={catalog}
          value="a {{ b"
          onChange={jest.fn()}
          anchorAtCaret={anchorAtCaret}
        >
          {(next) => {
            bind = next;
            return <span />;
          }}
        </ReferenceCapableField>
      </I18nProvider>
    );
    act(() => (bind as ReferenceCapableBind).registerSelection(bridge));
    return { bind: () => bind as ReferenceCapableBind };
  };
  const anchor = () => screen.getByTestId('mockTypeahead').getAttribute('data-anchor');

  it('opens a multi-line editor under the line the reference started on, relative to the field', () => {
    const host = setup(true);

    act(() => host.bind().reportChange('a {{', 4, '{'));

    // The trigger began at offset 2, so x = 100 + 20 - 100; the line's bottom is 204 + 18 - 150.
    expect(getCaretRect).toHaveBeenCalledWith(2);
    expect(anchor()).toBe('72,20');
  });

  it('opens at the caret when the insert button started it', () => {
    const host = setup(true);

    act(() => host.bind().togglePicker());

    expect(getCaretRect).toHaveBeenCalledWith(5);
    expect(anchor()).toBe('72,50');
  });

  it('keeps the dropdown where it opened while the variable is typed', () => {
    const host = setup(true);
    act(() => host.bind().reportChange('a {{', 4, '{'));

    act(() => host.bind().reportChange('a {{ e', 6, 'e'));
    act(() => host.bind().reportChange('a {{ ev', 7, 'v'));

    expect(getCaretRect).toHaveBeenCalledTimes(1);
    expect(anchor()).toBe('72,20');
  });

  it('measures again for the next reference', () => {
    const host = setup(true);
    act(() => host.bind().reportChange('a {{', 4, '{'));
    act(() => host.bind().closePicker());

    act(() => host.bind().reportChange('a {{ b {{', 9, '{'));

    expect(getCaretRect).toHaveBeenLastCalledWith(7);
  });

  it('leaves a single-line field to open under its control', () => {
    const host = setup();

    act(() => host.bind().reportChange('a {{', 4, '{'));

    expect(getCaretRect).not.toHaveBeenCalled();
    expect(anchor()).toBe('');
  });

  it('falls back to under the control when the editor cannot say where the cursor is', () => {
    const host = setup(true);
    getCaretRect.mockReturnValueOnce(undefined as never);

    act(() => host.bind().reportChange('a {{', 4, '{'));

    expect(anchor()).toBe('');
  });
});
