/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

let mockUndoRedoService: ReturnType<typeof createMockUndoRedoService> | undefined;

const createMockUndoRedoService = () => {
  const past: Array<{ undo: () => void; redo: () => void }> = [];
  const future: Array<{ undo: () => void; redo: () => void }> = [];
  return {
    past,
    future,
    pushElement: jest.fn((el: { undo: () => void; redo: () => void }) => {
      past.push(el);
      future.length = 0;
    }),
    undo: jest.fn(() => {
      const el = past.pop();
      if (el) {
        el.undo();
        future.push(el);
      }
    }),
    redo: jest.fn(() => {
      const el = future.pop();
      if (el) {
        el.redo();
        past.push(el);
      }
    }),
  };
};

jest.mock('@kbn/monaco', () => {
  const createMockModel = (content: string, languageId: string = 'yaml') => {
    let value = content;
    return {
      getValue: jest.fn(() => value),
      setValue: jest.fn((v: string) => {
        value = v;
      }),
      getLanguageId: jest.fn(() => languageId),
      dispose: jest.fn(),
    };
  };

  return {
    getUndoRedoService: jest.fn(() => mockUndoRedoService),
    monaco: {
      Range: class MockRange {
        public startLineNumber: number;
        public startColumn: number;
        public endLineNumber: number;
        public endColumn: number;
        constructor(sln: number, sc: number, eln: number, ec: number) {
          this.startLineNumber = sln;
          this.startColumn = sc;
          this.endLineNumber = eln;
          this.endColumn = ec;
        }
      },
      editor: {
        createModel: jest.fn((content: string, languageId?: string) =>
          createMockModel(content, languageId)
        ),
        colorizeModelLine: jest.fn(() => '<span>colorized</span>'),
        EditorOption: { fontInfo: 50 },
      },
    },
  };
});

import { ProposalManager } from './proposed_changes';

const createRealisticMockEditor = (initialContent: string) => {
  const lines = initialContent.split('\n');
  let zoneCounter = 0;
  const contentChangeListeners: Array<() => void> = [];

  const applyEditsToLines = (
    ops: Array<{
      range: {
        startLineNumber: number;
        startColumn: number;
        endLineNumber: number;
        endColumn: number;
      };
      text: string | null;
    }>
  ) => {
    for (const { range: r, text } of ops) {
      const sln = Math.max(1, Math.min(r.startLineNumber, lines.length));
      const eln = Math.max(sln, Math.min(r.endLineNumber, lines.length));
      const before = lines[sln - 1].substring(0, r.startColumn - 1);
      const after = lines[eln - 1].substring(r.endColumn - 1);
      lines.splice(sln - 1, eln - sln + 1, ...(before + (text ?? '') + after).split('\n'));
    }
  };

  const model = {
    uri: { toString: () => 'inmemory://model/1' },
    getLineCount: jest.fn(() => lines.length),
    getLineMaxColumn: jest.fn((ln: number) => {
      if (ln < 1 || ln > lines.length) return 1;
      return lines[ln - 1].length + 1;
    }),
    getValue: jest.fn(() => lines.join('\n')),
    pushEditOperations: jest.fn(
      (
        _s: unknown,
        ops: Array<{
          range: {
            startLineNumber: number;
            startColumn: number;
            endLineNumber: number;
            endColumn: number;
          };
          text: string | null;
        }>,
        cb: () => null
      ) => {
        applyEditsToLines(ops);
        cb();
        return null;
      }
    ),
    applyEdits: jest.fn(
      (
        ops: Array<{
          range: {
            startLineNumber: number;
            startColumn: number;
            endLineNumber: number;
            endColumn: number;
          };
          text: string | null;
        }>,
        computeUndoEdits?: boolean
      ) => {
        const prevContent = computeUndoEdits ? lines.join('\n') : null;
        applyEditsToLines(ops);
        if (computeUndoEdits && prevContent != null) {
          const newLastLine = lines.length;
          const newLastCol = lines[newLastLine - 1].length + 1;
          return [
            {
              range: {
                startLineNumber: 1,
                startColumn: 1,
                endLineNumber: newLastLine,
                endColumn: newLastCol,
              },
              text: prevContent,
            },
          ];
        }
        return undefined;
      }
    ),
    getLanguageId: jest.fn(() => 'yaml'),
    getOptions: jest.fn(() => ({ tabSize: 2 })),
    onDidChangeContent: jest.fn((listener: () => void) => {
      contentChangeListeners.push(listener);
      return { dispose: jest.fn() };
    }),
  };

  const domNode = {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  };

  return {
    getDomNode: jest.fn(() => domNode),
    getModel: jest.fn(() => model),
    getOption: jest.fn(() => ({
      fontFamily: 'monospace',
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0,
      fontWeight: 'normal',
    })),
    getLayoutInfo: jest.fn(() => ({
      contentLeft: 64,
      contentWidth: 800,
      verticalScrollbarWidth: 10,
    })),
    getPosition: jest.fn(() => ({ lineNumber: 1 })),
    revealLineInCenter: jest.fn(),
    pushUndoStop: jest.fn(),
    changeViewZones: jest.fn((cb: any) => {
      cb({
        addZone: jest.fn(() => `zone-${zoneCounter++}`),
        removeZone: jest.fn(),
      });
    }),
    createDecorationsCollection: jest.fn(() => ({ clear: jest.fn() })),
    deltaDecorations: jest.fn(() => []),
    onMouseMove: jest.fn(() => ({ dispose: jest.fn() })),
    onDidChangeCursorPosition: jest.fn(() => ({ dispose: jest.fn() })),
    _simulateExternalContentChange: () => {
      contentChangeListeners.forEach((l) => l());
    },
  } as any;
};

describe('ProposalManager', () => {
  let manager: ProposalManager;

  beforeEach(() => {
    manager = new ProposalManager();
  });

  afterEach(() => {
    manager.dispose();
  });

  it('initialize registers document hotkeys and editor hover targets', () => {
    const addDocSpy = jest.spyOn(document, 'addEventListener');
    const editor = createRealisticMockEditor('line1\nline2\nline3');
    manager.initialize(editor);

    const domNode = editor.getDomNode();
    expect(domNode.addEventListener).toHaveBeenCalledWith('mouseenter', expect.any(Function));
    expect(domNode.addEventListener).toHaveBeenCalledWith('mouseleave', expect.any(Function));

    expect(addDocSpy).toHaveBeenCalledWith('keydown', expect.any(Function), true);

    addDocSpy.mockRestore();
  });

  it('dispose removes document hotkeys and editor hover listeners', () => {
    const addDocSpy = jest.spyOn(document, 'addEventListener');
    const removeDocSpy = jest.spyOn(document, 'removeEventListener');

    const editor = createRealisticMockEditor('line1\nline2\nline3');
    manager.initialize(editor);

    const domNode = editor.getDomNode();
    const enterHandler = (domNode.addEventListener as jest.Mock).mock.calls.find(
      (c: unknown[]) => c[0] === 'mouseenter'
    )?.[1];
    const leaveHandler = (domNode.addEventListener as jest.Mock).mock.calls.find(
      (c: unknown[]) => c[0] === 'mouseleave'
    )?.[1];
    const keyHandler = addDocSpy.mock.calls.find(
      (c: unknown[]) => c[0] === 'keydown' && c[2] === true
    )?.[1];

    expect(enterHandler).toBeDefined();
    expect(leaveHandler).toBeDefined();
    expect(keyHandler).toBeDefined();

    manager.dispose();

    expect(domNode.removeEventListener).toHaveBeenCalledWith('mouseenter', enterHandler);
    expect(domNode.removeEventListener).toHaveBeenCalledWith('mouseleave', leaveHandler);
    expect(removeDocSpy).toHaveBeenCalledWith('keydown', keyHandler, true);

    addDocSpy.mockRestore();
    removeDocSpy.mockRestore();
  });

  it('accept-all hotkey runs only while pointer is over editor surface', () => {
    const addDocSpy = jest.spyOn(document, 'addEventListener');
    const onAccept = jest.fn();
    const editor = createRealisticMockEditor('line1\nline2\nline3');
    manager.initialize(editor, { onAccept });

    manager.applyAfterYaml('line1\nchanged\nline3\n');
    const keyHandler = addDocSpy.mock.calls.find(
      (c: unknown[]) => c[0] === 'keydown' && c[2] === true
    )![1] as (e: KeyboardEvent) => void;

    const domNode = editor.getDomNode();
    const enterHandler = (domNode.addEventListener as jest.Mock).mock.calls.find(
      (c: unknown[]) => c[0] === 'mouseenter'
    )![1] as () => void;

    keyHandler({
      key: 'a',
      ctrlKey: true,
      shiftKey: true,
      metaKey: true,
      altKey: false,
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    } as unknown as KeyboardEvent);
    expect(manager.hasPendingProposals()).toBe(true);

    enterHandler();
    keyHandler({
      key: 'a',
      ctrlKey: true,
      shiftKey: true,
      metaKey: true,
      altKey: false,
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    } as unknown as KeyboardEvent);

    expect(manager.hasPendingProposals()).toBe(false);
    expect(onAccept).toHaveBeenCalledWith('all');

    addDocSpy.mockRestore();
  });

  it('decline-all hotkey runs only while pointer is over editor surface', () => {
    const addDocSpy = jest.spyOn(document, 'addEventListener');
    const onReject = jest.fn();
    const original = 'line1\nline2\nline3\n';
    const editor = createRealisticMockEditor(original);
    manager.initialize(editor, { onReject });

    manager.applyAfterYaml('line1\nchanged\nline3\n');
    const keyHandler = addDocSpy.mock.calls.find(
      (c: unknown[]) => c[0] === 'keydown' && c[2] === true
    )![1] as (e: KeyboardEvent) => void;

    const domNode = editor.getDomNode();
    const enterHandler = (domNode.addEventListener as jest.Mock).mock.calls.find(
      (c: unknown[]) => c[0] === 'mouseenter'
    )![1] as () => void;

    enterHandler();
    keyHandler({
      key: 'Backspace',
      ctrlKey: true,
      shiftKey: false,
      metaKey: true,
      altKey: false,
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    } as unknown as KeyboardEvent);

    expect(editor.getModel().getValue()).toBe(original);
    expect(manager.hasPendingProposals()).toBe(false);
    expect(onReject).toHaveBeenCalledWith('all');

    addDocSpy.mockRestore();
  });

  describe('applyAfterYaml', () => {
    it('creates diff hunks for modified content', () => {
      const editor = createRealisticMockEditor('line1\nline2\nline3\n');
      manager.initialize(editor);

      manager.applyAfterYaml('line1\nchanged\nline3\n');

      expect(manager.hasPendingProposals()).toBe(true);
      expect(manager.getDiffHunks()).toHaveLength(1);
      expect(manager.getDiffHunks()[0].type).toBe('replace');
    });

    it('creates no hunks when content is identical', () => {
      const content = 'line1\nline2\nline3\n';
      const editor = createRealisticMockEditor(content);
      manager.initialize(editor);

      manager.applyAfterYaml(content);

      expect(manager.hasPendingProposals()).toBe(false);
      expect(manager.getDiffHunks()).toHaveLength(0);
    });

    it('detects insert hunks', () => {
      const editor = createRealisticMockEditor('line1\nline2\n');
      manager.initialize(editor);

      manager.applyAfterYaml('line1\ninserted\nline2\n');

      const hunks = manager.getDiffHunks();
      expect(hunks).toHaveLength(1);
      expect(hunks[0].type).toBe('insert');
    });

    it('detects delete hunks', () => {
      const editor = createRealisticMockEditor('line1\nline2\nline3\n');
      manager.initialize(editor);

      manager.applyAfterYaml('line1\nline3\n');

      const hunks = manager.getDiffHunks();
      expect(hunks).toHaveLength(1);
      expect(hunks[0].type).toBe('delete');
    });

    it('detects multiple hunks for non-adjacent changes', () => {
      const editor = createRealisticMockEditor('line1\nline2\nline3\nline4\nline5\n');
      manager.initialize(editor);

      manager.applyAfterYaml('line1\nchanged2\nline3\nchanged4\nline5\n');

      const hunks = manager.getDiffHunks();
      expect(hunks).toHaveLength(2);
    });

    it('replaces editor model content', () => {
      const editor = createRealisticMockEditor('line1\nline2\nline3\n');
      manager.initialize(editor);

      manager.applyAfterYaml('line1\nchanged\nline3\n');

      expect(editor.getModel().getValue()).toBe('line1\nchanged\nline3\n');
    });

    it('trailing newline normalization: double-newline afterYaml produces no changes', () => {
      const editor = createRealisticMockEditor('line1\nline2\nline3\n');
      manager.initialize(editor);

      manager.applyAfterYaml('line1\nline2\nline3\n\n');

      expect(manager.hasPendingProposals()).toBe(false);
      expect(manager.getDiffHunks()).toHaveLength(0);
    });

    it('insert at end of file with trailing newline', () => {
      const original = 'name: test\nsteps:\n  - name: s1\n    type: console\n';
      const afterYaml =
        'name: test\nsteps:\n  - name: s1\n    type: console\n  - name: s2\n    type: console\n';
      const editor = createRealisticMockEditor(original);
      manager.initialize(editor);

      manager.applyAfterYaml(afterYaml);

      expect(editor.getModel().getValue()).toBe(afterYaml);
      expect(manager.hasPendingProposals()).toBe(true);
    });

    it('insert at end of file without trailing newline', () => {
      const editor = createRealisticMockEditor(
        'name: test\nsteps:\n  - name: s1\n    type: console'
      );
      manager.initialize(editor);

      manager.applyAfterYaml(
        'name: test\nsteps:\n  - name: s1\n    type: console\n  - name: s2\n    type: console\n'
      );

      expect(editor.getModel().getValue()).toContain('- name: s2');
      expect(manager.hasPendingProposals()).toBe(true);
    });
  });

  describe('acceptHunk', () => {
    it('removes the accepted hunk from pending', () => {
      const editor = createRealisticMockEditor('line1\nline2\n');
      manager.initialize(editor);

      manager.applyAfterYaml('line1\nchanged\n');
      expect(manager.getDiffHunks()).toHaveLength(1);

      manager.acceptHunk(0);

      expect(manager.hasPendingProposals()).toBe(false);
    });

    it('keeps editor model content after accept', () => {
      const editor = createRealisticMockEditor('line1\nline2\n');
      manager.initialize(editor);

      manager.applyAfterYaml('line1\nchanged\n');
      manager.acceptHunk(0);

      expect(editor.getModel().getValue()).toContain('changed');
    });

    it('fires onAccept callback when last hunk is accepted', () => {
      const onAccept = jest.fn();
      const editor = createRealisticMockEditor('line1\nline2\n');
      manager.initialize(editor, { onAccept });

      manager.applyAfterYaml('line1\nchanged\n');
      manager.acceptHunk(0);

      expect(onAccept).toHaveBeenCalledWith('all');
    });
  });

  describe('rejectHunk', () => {
    it('restores original content for the rejected hunk', () => {
      const original = 'line1\nline2\nline3\n';
      const editor = createRealisticMockEditor(original);
      manager.initialize(editor);

      manager.applyAfterYaml('line1\nchanged\nline3\n');
      manager.rejectHunk(0);

      expect(editor.getModel().getValue()).toBe(original);
    });

    it('fires onReject callback when last hunk is rejected', () => {
      const onReject = jest.fn();
      const editor = createRealisticMockEditor('line1\nline2\n');
      manager.initialize(editor, { onReject });

      manager.applyAfterYaml('line1\nchanged\n');
      manager.rejectHunk(0);

      expect(onReject).toHaveBeenCalledWith('all');
    });
  });

  describe('acceptAll', () => {
    it('clears all hunks and calls onAccept', () => {
      const onAccept = jest.fn();
      const editor = createRealisticMockEditor('line1\nline2\nline3\nline4\nline5\n');
      manager.initialize(editor, { onAccept });

      manager.applyAfterYaml('line1\nchanged2\nline3\nchanged4\nline5\n');
      expect(manager.getDiffHunks().length).toBeGreaterThan(0);

      manager.acceptAll();

      expect(manager.hasPendingProposals()).toBe(false);
      expect(onAccept).toHaveBeenCalledWith('all');
    });

    it('preserves editor model content after acceptAll', () => {
      const editor = createRealisticMockEditor('line1\nline2\nline3\n');
      manager.initialize(editor);

      manager.applyAfterYaml('line1\nchanged\nline3\n');
      manager.acceptAll();

      expect(editor.getModel().getValue()).toContain('changed');
    });
  });

  describe('rejectAll', () => {
    it('restores original content and calls onReject', () => {
      const onReject = jest.fn();
      const original = 'line1\nline2\nline3\n';
      const editor = createRealisticMockEditor(original);
      manager.initialize(editor, { onReject });

      manager.applyAfterYaml('line1\nchanged\nline3\n');
      manager.rejectAll();

      expect(editor.getModel().getValue()).toBe(original);
      expect(manager.hasPendingProposals()).toBe(false);
      expect(onReject).toHaveBeenCalledWith('all');
    });

    it('restores original content after insert', () => {
      const original = 'line1\nline2\n';
      const editor = createRealisticMockEditor(original);
      manager.initialize(editor);

      manager.applyAfterYaml('line1\ninserted\nline2\n');
      manager.rejectAll();

      expect(editor.getModel().getValue()).toBe(original);
    });

    it('restores original content after delete', () => {
      const original = 'line1\nline2\nline3\n';
      const editor = createRealisticMockEditor(original);
      manager.initialize(editor);

      manager.applyAfterYaml('line1\nline3\n');
      manager.rejectAll();

      expect(editor.getModel().getValue()).toBe(original);
    });

    it('restores original content after mixed changes', () => {
      const original = 'line1\nline2\nline3\nline4\nline5\nline6\n';
      const editor = createRealisticMockEditor(original);
      manager.initialize(editor);

      manager.applyAfterYaml('inserted\nline1\nline2\nreplaced4\nline5\nline6\n');
      manager.rejectAll();

      expect(editor.getModel().getValue()).toBe(original);
    });
  });

  describe('hasPendingProposals', () => {
    it('returns false when no changes applied', () => {
      const editor = createRealisticMockEditor('line1\nline2\n');
      manager.initialize(editor);

      expect(manager.hasPendingProposals()).toBe(false);
    });

    it('returns true after applyAfterYaml with different content', () => {
      const editor = createRealisticMockEditor('line1\nline2\n');
      manager.initialize(editor);

      manager.applyAfterYaml('line1\nchanged\n');

      expect(manager.hasPendingProposals()).toBe(true);
    });

    it('returns false after acceptAll', () => {
      const editor = createRealisticMockEditor('line1\nline2\n');
      manager.initialize(editor);

      manager.applyAfterYaml('line1\nchanged\n');
      manager.acceptAll();

      expect(manager.hasPendingProposals()).toBe(false);
    });

    it('returns false after rejectAll', () => {
      const editor = createRealisticMockEditor('line1\nline2\n');
      manager.initialize(editor);

      manager.applyAfterYaml('line1\nchanged\n');
      manager.rejectAll();

      expect(manager.hasPendingProposals()).toBe(false);
    });
  });

  describe('sequential applyAfterYaml calls', () => {
    it('second call updates diff hunks from original baseline', () => {
      const editor = createRealisticMockEditor('line1\nline2\nline3\n');
      manager.initialize(editor);

      manager.applyAfterYaml('line1\nchangedV1\nline3\n');
      expect(manager.getDiffHunks()).toHaveLength(1);

      manager.applyAfterYaml('line1\nchangedV2\nline3\n');
      expect(manager.getDiffHunks()).toHaveLength(1);
      expect(editor.getModel().getValue()).toContain('changedV2');
    });

    it('rejectAll after sequential edits restores pre-AI original', () => {
      const original = 'line1\nline2\nline3\n';
      const editor = createRealisticMockEditor(original);
      manager.initialize(editor);

      manager.applyAfterYaml('line1\nchangedV1\nline3\n');
      manager.applyAfterYaml('line1\nchangedV2\nline3\n');

      manager.rejectAll();

      expect(editor.getModel().getValue()).toBe(original);
    });

    it('acceptAll after sequential edits keeps latest content', () => {
      const editor = createRealisticMockEditor('line1\nline2\nline3\n');
      manager.initialize(editor);

      manager.applyAfterYaml('line1\nchangedV1\nline3\n');
      manager.applyAfterYaml('line1\nchangedV2\nline3\n');

      manager.acceptAll();

      expect(editor.getModel().getValue()).toContain('changedV2');
      expect(manager.hasPendingProposals()).toBe(false);
    });
  });

  describe('external content changes', () => {
    it('recomputes diff on external model change when proposals are pending', () => {
      const editor = createRealisticMockEditor('line1\nline2\nline3\n');
      manager.initialize(editor);

      manager.applyAfterYaml('line1\nchanged\nline3\n');
      expect(manager.getDiffHunks()).toHaveLength(1);

      editor._simulateExternalContentChange();

      expect(manager.getDiffHunks()).toHaveLength(1);
    });

    it('is a no-op when there are no pending proposals', () => {
      const editor = createRealisticMockEditor('line1\nline2\nline3\n');
      manager.initialize(editor);

      editor._simulateExternalContentChange();

      expect(manager.hasPendingProposals()).toBe(false);
    });

    it('updates originalModel baseline when editor content changes without proposals', () => {
      const editor = createRealisticMockEditor('default\n');
      manager.initialize(editor);

      const model = editor.getModel();
      model.pushEditOperations(
        null,
        [
          {
            range: {
              startLineNumber: 1,
              startColumn: 1,
              endLineNumber: 1,
              endColumn: model.getLineMaxColumn(1),
            },
            text: 'user-content',
          },
        ],
        () => null
      );
      editor._simulateExternalContentChange();

      manager.applyAfterYaml('user-content\nnew-line\n');
      manager.rejectAll();

      expect(editor.getModel().getValue()).toBe('user-content\n');
    });
  });

  describe('granular undo/redo', () => {
    beforeEach(() => {
      mockUndoRedoService = createMockUndoRedoService();
    });

    afterEach(() => {
      mockUndoRedoService = undefined;
    });

    it('acceptHunk then undo restores hunk as pending', () => {
      const editor = createRealisticMockEditor('line1\nline2\nline3\n');
      manager.initialize(editor);

      manager.applyAfterYaml('line1\nchanged\nline3\n');
      expect(manager.getDiffHunks()).toHaveLength(1);

      manager.acceptHunk(0);
      expect(manager.hasPendingProposals()).toBe(false);

      mockUndoRedoService!.undo();

      expect(manager.hasPendingProposals()).toBe(true);
      expect(manager.getDiffHunks()).toHaveLength(1);
      expect(manager.getDiffHunks()[0].type).toBe('replace');
    });

    it('rejectHunk then undo restores hunk and AI text', () => {
      const editor = createRealisticMockEditor('line1\nline2\nline3\n');
      manager.initialize(editor);

      manager.applyAfterYaml('line1\nchanged\nline3\n');
      expect(editor.getModel().getValue()).toContain('changed');

      manager.rejectHunk(0);
      expect(manager.hasPendingProposals()).toBe(false);
      expect(editor.getModel().getValue()).not.toContain('changed');

      mockUndoRedoService!.undo();

      expect(manager.hasPendingProposals()).toBe(true);
      expect(editor.getModel().getValue()).toContain('changed');
    });

    it('undo of accept then redo re-accepts hunk', () => {
      const editor = createRealisticMockEditor('line1\nline2\nline3\n');
      manager.initialize(editor);

      manager.applyAfterYaml('line1\nchanged\nline3\n');

      manager.acceptHunk(0);
      expect(manager.hasPendingProposals()).toBe(false);

      mockUndoRedoService!.undo();
      expect(manager.hasPendingProposals()).toBe(true);

      mockUndoRedoService!.redo();
      expect(manager.hasPendingProposals()).toBe(false);
    });

    it('undo of reject then redo re-rejects hunk', () => {
      const editor = createRealisticMockEditor('line1\nline2\nline3\n');
      manager.initialize(editor);

      manager.applyAfterYaml('line1\nchanged\nline3\n');

      manager.rejectHunk(0);
      expect(editor.getModel().getValue()).not.toContain('changed');

      mockUndoRedoService!.undo();
      expect(editor.getModel().getValue()).toContain('changed');

      mockUndoRedoService!.redo();
      expect(editor.getModel().getValue()).not.toContain('changed');
      expect(manager.hasPendingProposals()).toBe(false);
    });

    it('accept hunk 0, accept hunk 0 again (shifted), undo only restores last', () => {
      const editor = createRealisticMockEditor('line1\nline2\nline3\nline4\nline5\n');
      manager.initialize(editor);

      manager.applyAfterYaml('line1\nchanged2\nline3\nchanged4\nline5\n');
      expect(manager.getDiffHunks()).toHaveLength(2);

      manager.acceptHunk(0);
      expect(manager.getDiffHunks()).toHaveLength(1);

      manager.acceptHunk(0);
      expect(manager.hasPendingProposals()).toBe(false);

      mockUndoRedoService!.undo();
      expect(manager.getDiffHunks()).toHaveLength(1);
      expect(manager.hasPendingProposals()).toBe(true);
    });

    it('rejectAll of 2 hunks, two undos restore both', () => {
      const editor = createRealisticMockEditor('line1\nline2\nline3\nline4\nline5\n');
      manager.initialize(editor);

      manager.applyAfterYaml('line1\nchanged2\nline3\nchanged4\nline5\n');
      expect(manager.getDiffHunks()).toHaveLength(2);

      manager.rejectAll();
      expect(manager.hasPendingProposals()).toBe(false);
      expect(editor.getModel().getValue()).not.toContain('changed');

      mockUndoRedoService!.undo();
      expect(manager.getDiffHunks()).toHaveLength(1);

      mockUndoRedoService!.undo();
      expect(manager.getDiffHunks()).toHaveLength(2);
      expect(editor.getModel().getValue()).toContain('changed2');
      expect(editor.getModel().getValue()).toContain('changed4');
    });

    it('acceptAll of 2 hunks, two undos restore both', () => {
      const editor = createRealisticMockEditor('line1\nline2\nline3\nline4\nline5\n');
      manager.initialize(editor);

      manager.applyAfterYaml('line1\nchanged2\nline3\nchanged4\nline5\n');
      expect(manager.getDiffHunks()).toHaveLength(2);

      manager.acceptAll();
      expect(manager.hasPendingProposals()).toBe(false);

      mockUndoRedoService!.undo();
      expect(manager.getDiffHunks()).toHaveLength(1);

      mockUndoRedoService!.undo();
      expect(manager.getDiffHunks()).toHaveLength(2);
    });

    it('dispose does not push undo elements', () => {
      const editor = createRealisticMockEditor('line1\nline2\nline3\n');
      manager.initialize(editor);

      manager.applyAfterYaml('line1\nchanged\nline3\n');
      const pushCountBefore = mockUndoRedoService!.pushElement.mock.calls.length;

      manager.dispose();

      expect(mockUndoRedoService!.pushElement.mock.calls.length).toBe(pushCountBefore);
      manager = new ProposalManager();
    });
  });
});
