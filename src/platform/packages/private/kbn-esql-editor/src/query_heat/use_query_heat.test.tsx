/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import type { monaco } from '@kbn/code-editor';
import { useQueryHeat } from './use_query_heat';
import type { EditorCommandHeat } from './query_heat';

const mockRegisterCommand = jest.fn();

jest.mock('@kbn/code-editor', () => ({
  monaco: {
    editor: {
      registerCommand: (...args: unknown[]) => mockRegisterCommand(...args),
      MouseTargetType: { GUTTER_LINE_DECORATIONS: 4, CONTENT_TEXT: 6 },
    },
  },
}));

const query = 'FROM logs\n| STATS c = COUNT(*)';
const heat: EditorCommandHeat = {
  query,
  commands: [
    { start: 0, end: 9, share: 0.2, isApproximate: false, operators: ['LuceneSource'] },
    { start: 12, end: 30, share: 0.8, isApproximate: false, operators: ['HashAggregation'] },
  ],
};

const buildEditor = (initialText: string) => {
  let text = initialText;
  const contentListeners: Array<() => void> = [];
  const mouseListeners: Array<(event: unknown) => void> = [];
  const dispose = jest.fn();
  const collection = { set: jest.fn(), clear: jest.fn() };

  const model = {
    uri: { toString: () => 'inmemory://model/1' },
    getValue: () => text,
    getPositionAt: (offset: number) => {
      const lines = text.slice(0, offset).split('\n');
      return { lineNumber: lines.length, column: lines[lines.length - 1].length + 1 };
    },
    getLineMaxColumn: (line: number) => text.split('\n')[line - 1].length + 1,
  };
  const editor = {
    createDecorationsCollection: jest.fn(() => collection),
    onDidChangeModelContent: jest.fn((listener: () => void) => {
      contentListeners.push(listener);
      return { dispose };
    }),
    onMouseDown: jest.fn((listener: (event: unknown) => void) => {
      mouseListeners.push(listener);
      return { dispose };
    }),
  };

  return {
    editor,
    model,
    collection,
    dispose,
    edit: (next: string) => {
      text = next;
      contentListeners.forEach((listener) => listener());
    },
    clickGutter: (lineNumber: number, type = 4) =>
      mouseListeners.forEach((listener) =>
        listener({ target: { type, position: { lineNumber } } })
      ),
  };
};

const render = (
  built: ReturnType<typeof buildEditor>,
  props: { heat?: EditorCommandHeat; isEditorReady?: boolean; onSpeedUpCommand?: () => void }
) =>
  renderHook(
    (hookProps) =>
      useQueryHeat({
        editorRef: { current: built.editor as unknown as monaco.editor.IStandaloneCodeEditor },
        editorModel: { current: built.model as unknown as monaco.editor.ITextModel },
        isEditorReady: hookProps.isEditorReady ?? true,
        heat: hookProps.heat,
        onSpeedUpCommand: hookProps.onSpeedUpCommand,
      }),
    { initialProps: props }
  );

describe('useQueryHeat', () => {
  beforeEach(() => jest.clearAllMocks());

  it('decorates the commands while the text is the one the heat was measured on', () => {
    const built = buildEditor(query);

    render(built, { heat });

    const decorations = built.collection.set.mock.calls.at(-1)?.[0];
    expect(decorations).toHaveLength(6);
    // The stripes come first, one per line, and then a hover and a share for each command.
    expect(decorations[0].options.linesDecorationsClassName).toBe(
      'esqlHeatStripe esqlHeatStripe--cool'
    );
    expect(decorations[1].options.linesDecorationsClassName).toBe(
      'esqlHeatStripe esqlHeatStripe--hot'
    );
  });

  it('removes the decorations once the query is edited, and brings them back if it is restored', () => {
    const built = buildEditor(query);
    render(built, { heat });

    built.edit(`${query}\n| LIMIT 1`);
    expect(built.collection.set).toHaveBeenLastCalledWith([]);

    built.edit(query);
    expect(built.collection.set.mock.calls.at(-1)?.[0]).toHaveLength(6);
  });

  it('does nothing before the editor is ready or without heat, and cleans up after itself', () => {
    const built = buildEditor(query);

    const notReady = render(built, { heat, isEditorReady: false });
    expect(built.editor.createDecorationsCollection).not.toHaveBeenCalled();
    notReady.unmount();

    const noHeat = render(built, { heat: undefined });
    expect(built.editor.createDecorationsCollection).not.toHaveBeenCalled();
    noHeat.unmount();

    const shown = render(built, { heat });
    shown.unmount();
    expect(built.collection.clear).toHaveBeenCalled();
    expect(built.dispose).toHaveBeenCalledTimes(2);
  });

  it('offers the speed up action from a gutter click on a command, when it is offered', () => {
    const onSpeedUpCommand = jest.fn();
    const built = buildEditor(query);
    render(built, { heat, onSpeedUpCommand });

    built.clickGutter(2);
    expect(onSpeedUpCommand).toHaveBeenCalledWith(1);

    built.clickGutter(1);
    expect(onSpeedUpCommand).toHaveBeenLastCalledWith(0);
    expect(mockRegisterCommand).toHaveBeenCalledWith('esql.speedUpCommand', expect.any(Function));
    expect(built.collection.set.mock.calls.at(-1)?.[0][2].options.hoverMessage.value).toContain(
      'command:esql.speedUpCommand?'
    );
  });

  it('ignores gutter clicks without the action, and clicks on text or on stale heat', () => {
    const onSpeedUpCommand = jest.fn();
    const withoutAction = buildEditor(query);
    render(withoutAction, { heat });
    withoutAction.clickGutter(2);

    const stale = buildEditor(query);
    render(stale, { heat, onSpeedUpCommand });
    stale.edit(`${query} | LIMIT 1`);
    stale.clickGutter(2);

    expect(onSpeedUpCommand).not.toHaveBeenCalled();
  });
});
