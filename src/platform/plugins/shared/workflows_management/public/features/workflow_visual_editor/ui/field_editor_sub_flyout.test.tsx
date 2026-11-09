/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createEvent, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { FieldEditorSubFlyout } from './field_editor_sub_flyout';
import type { DataReferenceCatalog, DataReferenceItem } from '../lib/build_data_reference_catalog';

jest.mock('@kbn/monaco', () => ({ XJSON_LANG_ID: 'xjson' }));

jest.mock('@kbn/workflows-ui', () => ({
  workflowsEditorChromeOverrides: {},
  loadTypeIconMasks: () => Promise.resolve({}),
}));

jest.mock('./data_reference_catalog_tree', () => ({
  DataReferenceCatalogTree: ({ onInsert }: { onInsert: (token: string) => void }) => (
    <button
      type="button"
      data-test-subj="workflowDataReferenceCatalogTree"
      onClick={() => onInsert('{{ steps.a.output }}')}
    >
      {'insert'}
    </button>
  ),
}));

jest.mock('./reference_capable_field', () => ({
  ReferenceCapableField: ({
    children,
    onChange,
  }: {
    children: (bind: {
      teachingPlaceholder: string;
      appendControls: null;
      reportChange: (next: string, caret: number) => void;
      registerSelection: (bridge: unknown) => void;
    }) => React.ReactElement;
    value: string;
    onChange: (next: string) => void;
  }) =>
    children({
      teachingPlaceholder: 'Type @',
      appendControls: null,
      reportChange: (next) => onChange(next),
      registerSelection: () => undefined,
    }),
}));

/** Single-line stand-in for Monaco: a textarea whose `executeEdits` really edits the text. */
const mockEditorProps: { dropColumn: number } = { dropColumn: 1 };
interface MockCodeEditorProps {
  value: string;
  languageId: string;
  dataTestSubj?: string;
  onChange?: (v: string, event?: { changes: Array<{ rangeOffset: number; text: string }> }) => void;
  editorDidMount?: (editor: unknown) => void;
}

jest.mock('@kbn/code-editor', () => {
  const MockReact = jest.requireActual('react');
  return {
    monaco: {
      languages: {
        getLanguages: () => [],
        register: () => undefined,
        setMonarchTokensProvider: () => undefined,
        setLanguageConfiguration: () => undefined,
      },
    },
    CodeEditor: (props: MockCodeEditorProps) => {
      const textareaRef = MockReact.useRef(null);
      const valueRef = MockReact.useRef(props.value);
      valueRef.current = props.value;
      const callbacksRef = MockReact.useRef(props);
      callbacksRef.current = {
        ...callbacksRef.current,
        editorDidMount: props.editorDidMount,
        onChange: props.onChange,
      };
      // Mount once, like Monaco.
      MockReact.useEffect(() => {
        callbacksRef.current.editorDidMount?.({
          focus: () => textareaRef.current?.focus(),
          getModel: () => ({
            getOffsetAt: (pos: { column: number }) => pos.column - 1,
            getPositionAt: (offset: number) => ({ lineNumber: 1, column: offset + 1 }),
            getValueLength: () => valueRef.current.length,
          }),
          getPosition: () => ({
            lineNumber: 1,
            column: (textareaRef.current?.selectionStart ?? valueRef.current.length) + 1,
          }),
          setPosition: (pos: { column: number }) =>
            textareaRef.current?.setSelectionRange(pos.column - 1, pos.column - 1),
          revealPosition: () => undefined,
          getTargetAtClientPoint: () => ({
            position: { lineNumber: 1, column: mockEditorProps.dropColumn },
          }),
          executeEdits: (
            _source: string,
            edits: Array<{ range: { startColumn: number; endColumn: number }; text: string }>
          ) => {
            const [{ range, text }] = edits;
            const current = valueRef.current;
            const start = range.startColumn - 1;
            const next = `${current.slice(0, start)}${text}${current.slice(range.endColumn - 1)}`;
            callbacksRef.current.onChange?.(next, { changes: [{ rangeOffset: start, text }] });
          },
        });
      }, []);
      return (
        <textarea
          ref={textareaRef}
          data-test-subj={props.dataTestSubj ?? 'mocked-code-editor'}
          data-language={props.languageId}
          value={props.value}
          onChange={(e) =>
            props.onChange?.(e.target.value, {
              changes: [{ rangeOffset: 0, text: e.target.value }],
            })
          }
        />
      );
    },
  };
});

const item = (overrides: Partial<DataReferenceItem>): DataReferenceItem => ({
  path: 'p',
  label: 'p',
  typeLabel: 'string',
  drillable: false,
  originLabel: 'test',
  ...overrides,
});

const catalog: DataReferenceCatalog = { groups: [] };
const listCatalog = {
  groups: [
    {
      id: 'context',
      label: 'Context',
      description: '',
      emptyMessage: '',
      items: [item({ path: 'consts.tags', typeLabel: 'array' })],
    },
  ],
} as unknown as DataReferenceCatalog;

const renderFlyout = (
  overrides: Partial<React.ComponentProps<typeof FieldEditorSubFlyout>> = {}
) => {
  const onChange = jest.fn();
  render(
    <I18nProvider>
      <FieldEditorSubFlyout
        fieldLabel="Message"
        value="hi"
        onChange={onChange}
        catalog={catalog}
        onBack={jest.fn()}
        onCloseStack={jest.fn()}
        {...overrides}
      />
    </I18nProvider>
  );
  return { onChange };
};

describe('FieldEditorSubFlyout', () => {
  beforeEach(() => {
    mockEditorProps.dropColumn = 1;
  });

  it('Back / Escape close only the child; ✕ closes the whole stack', () => {
    const onBack = jest.fn();
    const onCloseStack = jest.fn();

    renderFlyout({ onBack, onCloseStack });

    fireEvent.click(screen.getByTestId('workflowFieldEditorSubFlyoutBack'));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onCloseStack).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('workflowFieldEditorSubFlyoutClose'));
    expect(onCloseStack).toHaveBeenCalledTimes(1);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('loads the field value and accepts typing with live write-through', () => {
    const { onChange } = renderFlyout({
      fieldLabel: 'Connector',
      value: '{\n  "id": "x"\n}',
      language: 'json',
    });

    expect(screen.getByTestId('workflowFieldEditorSubFlyoutValueLabel')).toHaveTextContent('Value');
    expect(screen.getByTestId('workflowFieldEditorSubFlyoutValueDescription')).toHaveTextContent(
      'Drag a reference in, or type @ / {{'
    );

    const editor = screen.getByTestId('workflowFieldEditorSubFlyoutTextarea');
    expect(editor).toHaveValue('{\n  "id": "x"\n}');
    expect(editor).toHaveAttribute('data-language', 'xjson');
    expect(screen.queryByTestId('workflowFieldEditorSubFlyoutFooter')).not.toBeInTheDocument();

    fireEvent.change(editor, { target: { value: '{"id":"y"}' } });
    expect(onChange).toHaveBeenCalledWith('{"id":"y"}');
  });

  it('keeps Cmd/Ctrl+Z and redo inside the editor instead of the canvas', () => {
    const outerKeyDown = jest.fn();
    const onChange = jest.fn();
    render(
      <I18nProvider>
        {/* Stands in for the canvas / YAML shortcuts that must not see undo and redo. */}
        <div role="presentation" onKeyDown={outerKeyDown}>
          <FieldEditorSubFlyout
            fieldLabel="Message"
            value="one"
            onChange={onChange}
            catalog={catalog}
            onBack={jest.fn()}
            onCloseStack={jest.fn()}
          />
        </div>
      </I18nProvider>
    );
    const editor = screen.getByTestId('workflowFieldEditorSubFlyoutTextarea');

    fireEvent.keyDown(editor, { key: 'z', metaKey: true });
    fireEvent.keyDown(editor, { key: 'z', metaKey: true, shiftKey: true });
    fireEvent.keyDown(editor, { key: 'y', ctrlKey: true });
    expect(outerKeyDown).not.toHaveBeenCalled();
    // The editor owns undo now: the flyout must not rewrite the value on its own.
    expect(onChange).not.toHaveBeenCalled();
    expect(editor).toHaveValue('one');

    // Other keys still reach the outside as before.
    fireEvent.keyDown(editor, { key: 'a' });
    expect(outerKeyDown).toHaveBeenCalledTimes(1);
  });

  it('inserts a tree pick at the caret as an editor edit', () => {
    const { onChange } = renderFlyout({ value: 'Hi ' });
    const editor = screen.getByTestId(
      'workflowFieldEditorSubFlyoutTextarea'
    ) as HTMLTextAreaElement;
    editor.setSelectionRange(3, 3);

    fireEvent.click(screen.getByTestId('workflowDataReferenceCatalogTree'));
    expect(onChange).toHaveBeenLastCalledWith('Hi {{ steps.a.output }}');
  });

  it('inserts a dropped reference exactly once, at the pointer position', () => {
    const { onChange } = renderFlyout({ value: 'Hello' });
    mockEditorProps.dropColumn = 3;

    const drop = createEvent.drop(screen.getByTestId('workflowFieldEditorSubFlyoutEditorPane'));
    Object.defineProperty(drop, 'dataTransfer', {
      value: { getData: () => '{{ steps.a.output }}' },
    });
    fireEvent(screen.getByTestId('workflowFieldEditorSubFlyoutEditorPane'), drop);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('He{{ steps.a.output }}llo');
  });

  it('warns about a list inside a sentence in plain text and rewrites it as JSON text', () => {
    const { onChange } = renderFlyout({
      value: 'Tags {{ consts.tags }} done',
      catalog: listCatalog,
    });
    expect(screen.getByTestId('workflowFieldEditorSubFlyout-containerCallout')).toBeVisible();

    fireEvent.click(screen.getByTestId('workflowFieldEditorSubFlyout-insertAsJson'));
    expect(onChange).toHaveBeenLastCalledWith('Tags {{ consts.tags | json }} done');
  });

  it('dismisses the warning with "Keep as is" without changing the text', () => {
    const { onChange } = renderFlyout({
      value: 'Tags {{ consts.tags }} done',
      catalog: listCatalog,
    });
    fireEvent.click(screen.getByTestId('workflowFieldEditorSubFlyout-keepAsIs'));
    expect(
      screen.queryByTestId('workflowFieldEditorSubFlyout-containerCallout')
    ).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('edits JSON + Liquid as text and offers a list inside it as JSON text', () => {
    const { onChange } = renderFlyout({
      value: '{"tags": {{ consts.tags }}}',
      catalog: listCatalog,
      language: 'json-liquid',
    });
    expect(document.querySelector('[data-language="workflows-json-liquid"]')).not.toBeNull();
    expect(screen.getByTestId('workflowFieldEditorSubFlyout-containerCallout')).toBeVisible();

    fireEvent.click(screen.getByTestId('workflowFieldEditorSubFlyout-insertAsJson'));
    expect(onChange).toHaveBeenLastCalledWith('{"tags": {{ consts.tags | json }}}');
  });

  it('does not warn inside a JSON field', () => {
    renderFlyout({
      value: '{ "tags": "{{ consts.tags }}" }',
      catalog: listCatalog,
      language: 'json',
    });
    expect(
      screen.queryByTestId('workflowFieldEditorSubFlyout-containerCallout')
    ).not.toBeInTheDocument();
  });
});
