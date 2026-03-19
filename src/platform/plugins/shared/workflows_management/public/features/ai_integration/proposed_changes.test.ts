/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('@kbn/monaco', () => ({
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
      createModel: jest.fn(() => ({ dispose: jest.fn() })),
      colorizeModelLine: jest.fn((_model: unknown, _line: number) => '<span>colorized</span>'),
      EditorOption: { fontInfo: 50 },
    },
  },
}));

import { ProposalManager } from './proposed_changes';
import type { ProposedChange } from './proposed_changes';

const createMockEditor = () => {
  const decorationsCollection = { clear: jest.fn() };
  const viewZones: string[] = [];
  let zoneCounter = 0;
  const contentChangeListeners: Array<() => void> = [];

  const editor = {
    getDomNode: jest.fn().mockReturnValue({
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }),
    getModel: jest.fn().mockReturnValue({
      getLineCount: jest.fn().mockReturnValue(10),
      getLineMaxColumn: jest.fn().mockReturnValue(80),
      getValueInRange: jest.fn().mockReturnValue('original content'),
      getValue: jest.fn().mockReturnValue('full content'),
      pushEditOperations: jest.fn(),
      getLanguageId: jest.fn().mockReturnValue('yaml'),
      getOptions: jest.fn().mockReturnValue({ tabSize: 2 }),
      onDidChangeContent: jest.fn((listener: () => void) => {
        contentChangeListeners.push(listener);
        return { dispose: jest.fn() };
      }),
    }),
    getOption: jest.fn().mockReturnValue({
      fontFamily: 'monospace',
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0,
      fontWeight: 'normal',
    }),
    getLayoutInfo: jest
      .fn()
      .mockReturnValue({ contentLeft: 64, contentWidth: 800, verticalScrollbarWidth: 10 }),
    getPosition: jest.fn().mockReturnValue({ lineNumber: 5 }),
    revealLineInCenter: jest.fn(),
    pushUndoStop: jest.fn(),
    changeViewZones: jest.fn((cb: (accessor: any) => void) => {
      cb({
        addZone: jest.fn(() => {
          const id = `zone-${zoneCounter++}`;
          viewZones.push(id);
          return id;
        }),
        removeZone: jest.fn(),
      });
    }),
    createDecorationsCollection: jest.fn().mockReturnValue(decorationsCollection),
    deltaDecorations: jest.fn().mockReturnValue([]),
    onMouseMove: jest.fn().mockReturnValue({ dispose: jest.fn() }),
    /** Simulate an external model change (e.g. undo) by firing content change listeners */
    _simulateExternalContentChange: () => {
      contentChangeListeners.forEach((l) => l());
    },
  } as any;

  return editor;
};

const createInsertChange = (id: string): ProposedChange => ({
  proposalId: id,
  type: 'insert',
  startLine: 5,
  newText: '  - name: new_step\n    type: console\n',
});

const createReplaceChange = (id: string): ProposedChange => ({
  proposalId: id,
  type: 'replace',
  startLine: 3,
  endLine: 3,
  newText: '  replaced_key: replaced_value',
});

describe('ProposalManager', () => {
  let manager: ProposalManager;

  beforeEach(() => {
    manager = new ProposalManager();
  });

  afterEach(() => {
    manager.dispose();
  });

  it('initialize attaches keydown handler to editor DOM', () => {
    const editor = createMockEditor();
    manager.initialize(editor);

    const domNode = editor.getDomNode();
    expect(domNode.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function), true);
  });

  it('proposeChange applies edit to model immediately', () => {
    const editor = createMockEditor();
    manager.initialize(editor);

    manager.proposeChange(createInsertChange('test-1'));

    const model = editor.getModel();
    expect(model.pushEditOperations).toHaveBeenCalledTimes(1);
    expect(editor.pushUndoStop).toHaveBeenCalled();
  });

  it('proposeChange adds proposal to pending list', () => {
    const editor = createMockEditor();
    manager.initialize(editor);

    manager.proposeChange(createInsertChange('test-1'));

    expect(manager.hasPendingProposals()).toBe(true);
    expect(manager.getPendingProposals()).toHaveLength(1);
    expect(manager.getPendingProposals()[0].proposalId).toBe('test-1');
  });

  it('proposeChange with multiple proposals keeps all of them', () => {
    const editor = createMockEditor();
    manager.initialize(editor);

    manager.proposeChange(createInsertChange('test-1'));
    manager.proposeChange(createInsertChange('test-2'));

    expect(manager.getPendingProposals()).toHaveLength(2);
  });

  it('acceptProposal removes from pending without additional model edits', () => {
    const editor = createMockEditor();
    manager.initialize(editor);
    manager.proposeChange(createInsertChange('test-1'));

    const model = editor.getModel();
    const callCountAfterPropose = model.pushEditOperations.mock.calls.length;

    manager.acceptProposal('test-1');

    expect(model.pushEditOperations).toHaveBeenCalledTimes(callCountAfterPropose);
    expect(manager.hasPendingProposals()).toBe(false);
  });

  it('acceptProposal calls onAccept callback', () => {
    const onAccept = jest.fn();
    const editor = createMockEditor();
    manager.initialize(editor, { onAccept });
    manager.proposeChange(createInsertChange('test-1'));

    manager.acceptProposal('test-1');

    expect(onAccept).toHaveBeenCalledWith('test-1');
  });

  it('rejectProposal undoes the edit and removes from pending', () => {
    const editor = createMockEditor();
    manager.initialize(editor);
    manager.proposeChange(createInsertChange('test-1'));

    const model = editor.getModel();
    const callCountAfterPropose = model.pushEditOperations.mock.calls.length;

    manager.rejectProposal('test-1');

    expect(model.pushEditOperations).toHaveBeenCalledTimes(callCountAfterPropose + 1);
    expect(manager.hasPendingProposals()).toBe(false);
  });

  it('rejectProposal calls onReject callback', () => {
    const onReject = jest.fn();
    const editor = createMockEditor();
    manager.initialize(editor, { onReject });
    manager.proposeChange(createInsertChange('test-1'));

    manager.rejectProposal('test-1');

    expect(onReject).toHaveBeenCalledWith('test-1');
  });

  it('acceptAll accepts all pending proposals', () => {
    const onAccept = jest.fn();
    const editor = createMockEditor();
    manager.initialize(editor, { onAccept });

    manager.proposeChange(createInsertChange('test-1'));
    manager.proposeChange(createInsertChange('test-2'));

    manager.acceptAll();

    expect(onAccept).toHaveBeenCalledTimes(2);
    expect(manager.hasPendingProposals()).toBe(false);
  });

  it('rejectAll rejects all pending proposals', () => {
    const onReject = jest.fn();
    const editor = createMockEditor();
    manager.initialize(editor, { onReject });

    manager.proposeChange(createInsertChange('test-1'));
    manager.proposeChange(createInsertChange('test-2'));

    manager.rejectAll();

    expect(onReject).toHaveBeenCalledTimes(2);
    expect(manager.hasPendingProposals()).toBe(false);
  });

  it('hasPendingProposals returns correct boolean', () => {
    const editor = createMockEditor();
    manager.initialize(editor);

    expect(manager.hasPendingProposals()).toBe(false);

    manager.proposeChange(createInsertChange('test-1'));
    expect(manager.hasPendingProposals()).toBe(true);

    manager.acceptProposal('test-1');
    expect(manager.hasPendingProposals()).toBe(false);
  });

  it('dispose cleans up keydown handler', () => {
    const editor = createMockEditor();
    manager.initialize(editor);

    manager.dispose();

    const domNode = editor.getDomNode();
    expect(domNode.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function), true);
  });

  it('proposeChange stores undo info for replace type', () => {
    const editor = createMockEditor();
    manager.initialize(editor);

    manager.proposeChange(createReplaceChange('test-replace'));

    const proposals = manager.getPendingProposals();
    expect(proposals).toHaveLength(1);
    expect(proposals[0].originalContent).toBe('original content');
    expect(proposals[0].undoEndLine).toBeDefined();
    expect(proposals[0].undoEndColumn).toBeDefined();
  });

  describe('acceptOverlapping', () => {
    it('clears only proposals whose line range overlaps the given range', () => {
      const onAccept = jest.fn();
      const editor = createMockEditor();
      manager.initialize(editor, { onAccept });

      manager.proposeChange(createReplaceChange('at-line-3'));

      const atLine8: ProposedChange = {
        proposalId: 'at-line-8',
        type: 'replace',
        startLine: 8,
        endLine: 8,
        newText: 'replacement at line 8',
      };
      manager.proposeChange(atLine8);

      expect(manager.getPendingProposals()).toHaveLength(2);

      manager.acceptOverlapping(2, 4);

      expect(onAccept).toHaveBeenCalledTimes(1);
      expect(onAccept).toHaveBeenCalledWith('at-line-3');

      const remaining = manager.getPendingProposals();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].proposalId).toBe('at-line-8');
    });

    it('is a no-op when no proposals overlap the given range', () => {
      const onAccept = jest.fn();
      const editor = createMockEditor();
      manager.initialize(editor, { onAccept });

      manager.proposeChange(createReplaceChange('at-line-3'));

      manager.acceptOverlapping(7, 9);

      expect(onAccept).not.toHaveBeenCalled();
      expect(manager.getPendingProposals()).toHaveLength(1);
    });

    it('clears all proposals when all overlap the given range', () => {
      const onAccept = jest.fn();
      const editor = createMockEditor();
      manager.initialize(editor, { onAccept });

      const atLine3a: ProposedChange = {
        proposalId: 'p1',
        type: 'replace',
        startLine: 3,
        endLine: 4,
        newText: 'first replacement',
      };
      const atLine3b: ProposedChange = {
        proposalId: 'p2',
        type: 'replace',
        startLine: 3,
        endLine: 3,
        newText: 'second replacement',
      };

      manager.proposeChange(atLine3a);
      manager.proposeChange(atLine3b);

      manager.acceptOverlapping(3, 4);

      expect(onAccept).toHaveBeenCalledTimes(2);
      expect(manager.hasPendingProposals()).toBe(false);
    });

    it('does not modify the model (accept is UI-only)', () => {
      const editor = createMockEditor();
      manager.initialize(editor);

      manager.proposeChange(createReplaceChange('at-line-3'));

      const model = editor.getModel();
      const callCountAfterPropose = model.pushEditOperations.mock.calls.length;

      manager.acceptOverlapping(2, 4);

      expect(model.pushEditOperations).toHaveBeenCalledTimes(callCountAfterPropose);
    });

    it('handles insert proposals using startLine for overlap', () => {
      const onAccept = jest.fn();
      const editor = createMockEditor();
      manager.initialize(editor, { onAccept });

      manager.proposeChange(createInsertChange('insert-at-5'));

      manager.acceptOverlapping(4, 6);

      expect(onAccept).toHaveBeenCalledWith('insert-at-5');
      expect(manager.hasPendingProposals()).toBe(false);
    });
  });

  describe('external content changes (undo)', () => {
    it('dismisses all proposals and clears decorations on external model change', () => {
      const onReject = jest.fn();
      const editor = createMockEditor();
      manager.initialize(editor, { onReject });

      manager.proposeChange(createInsertChange('test-1'));
      manager.proposeChange(createReplaceChange('test-2'));

      expect(manager.hasPendingProposals()).toBe(true);
      expect(manager.getPendingProposals()).toHaveLength(2);

      editor._simulateExternalContentChange();

      expect(manager.hasPendingProposals()).toBe(false);
      expect(onReject).toHaveBeenCalledTimes(2);

      const decoCollection = editor.createDecorationsCollection.mock.results[0].value;
      expect(decoCollection.clear).toHaveBeenCalled();
    });

    it('does not dismiss proposals when content change is from proposeChange', () => {
      const onReject = jest.fn();
      const editor = createMockEditor();

      const model = editor.getModel();
      model.pushEditOperations.mockImplementation(
        (_sel: unknown, _ops: unknown, cb: () => void) => {
          cb();
          editor._simulateExternalContentChange();
          return null;
        }
      );

      manager.initialize(editor, { onReject });

      manager.proposeChange(createInsertChange('test-1'));

      expect(manager.hasPendingProposals()).toBe(true);
      expect(onReject).not.toHaveBeenCalled();
    });

    it('does not dismiss proposals when content change is from rejectProposal', () => {
      const onReject = jest.fn();
      const editor = createMockEditor();

      let editCallCount = 0;
      const model = editor.getModel();
      model.pushEditOperations.mockImplementation(
        (_sel: unknown, _ops: unknown, cb: () => void) => {
          editCallCount++;
          cb();
          // Only fire content change on the second call (rejectProposal)
          if (editCallCount > 1) {
            editor._simulateExternalContentChange();
          }
          return null;
        }
      );

      manager.initialize(editor, { onReject });

      manager.proposeChange(createInsertChange('test-1'));
      expect(manager.hasPendingProposals()).toBe(true);

      manager.rejectProposal('test-1');

      expect(manager.hasPendingProposals()).toBe(false);
      // onReject is called exactly once — from rejectProposal, not from dismissAll
      expect(onReject).toHaveBeenCalledTimes(1);
      expect(onReject).toHaveBeenCalledWith('test-1');
    });

    it('is a no-op when there are no pending proposals', () => {
      const onReject = jest.fn();
      const editor = createMockEditor();
      manager.initialize(editor, { onReject });

      editor._simulateExternalContentChange();

      expect(onReject).not.toHaveBeenCalled();
    });
  });

  describe('rejectAll and revertAllSilently line-shift correctness', () => {
    /**
     * Mock editor backed by a real mutable text buffer.
     * pushEditOperations applies range-based edits to the underlying lines
     * array, so tests can verify model content after reject/revert.
     */
    const createRealisticMockEditor = (initialContent: string) => {
      const lines = initialContent.split('\n');
      let zoneCounter = 0;

      const model = {
        getLineCount: jest.fn(() => lines.length),
        getLineMaxColumn: jest.fn((ln: number) => {
          if (ln < 1 || ln > lines.length) return 1;
          return lines[ln - 1].length + 1;
        }),
        getValueInRange: jest.fn(
          (range: {
            startLineNumber: number;
            startColumn: number;
            endLineNumber: number;
            endColumn: number;
          }) => {
            const {
              startLineNumber: sln,
              startColumn: sc,
              endLineNumber: eln,
              endColumn: ec,
            } = range;
            if (sln === eln) return lines[sln - 1].substring(sc - 1, ec - 1);
            const parts = [lines[sln - 1].substring(sc - 1)];
            for (let i = sln; i < eln - 1; i++) parts.push(lines[i]);
            parts.push(lines[eln - 1].substring(0, ec - 1));
            return parts.join('\n');
          }
        ),
        getValue: jest.fn(() => lines.join('\n')),
        pushEditOperations: jest.fn((_s: unknown, ops: any[], cb: () => null) => {
          for (const { range: r, text } of ops) {
            const sln = Math.max(1, Math.min(r.startLineNumber, lines.length));
            const eln = Math.max(sln, Math.min(r.endLineNumber, lines.length));
            const before = lines[sln - 1].substring(0, r.startColumn - 1);
            const after = lines[eln - 1].substring(r.endColumn - 1);
            lines.splice(sln - 1, eln - sln + 1, ...(before + (text ?? '') + after).split('\n'));
          }
          cb();
          return null;
        }),
        getLanguageId: jest.fn(() => 'yaml'),
        getOptions: jest.fn(() => ({ tabSize: 2 })),
        onDidChangeContent: jest.fn(() => ({ dispose: jest.fn() })),
      };

      return {
        getDomNode: jest.fn(() => ({
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        })),
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
      } as any;
    };

    describe('rejectAll', () => {
      it('restores original content after a single replace proposal (baseline)', () => {
        const original = 'line1\nline2\nline3';
        const editor = createRealisticMockEditor(original);
        manager.initialize(editor);

        manager.proposeChange({
          proposalId: 'rep-2',
          type: 'replace',
          startLine: 2,
          endLine: 2,
          newText: 'replaced\n',
        });

        manager.rejectAll();

        expect(editor.getModel().getValue()).toBe(original);
      });

      it('restores original content after delete-then-replace proposals', () => {
        const original = 'line1\nline2\nline3\nline4\nline5';
        const editor = createRealisticMockEditor(original);
        manager.initialize(editor);

        // Delete line 2 → ["line1", "line3", "line4", "line5"]
        manager.proposeChange({
          proposalId: 'del-2',
          type: 'delete',
          startLine: 2,
          endLine: 2,
          newText: '',
        });
        // Replace line 3 (was "line4", shifted up) → ["line1", "line3", "replaced", "line5"]
        manager.proposeChange({
          proposalId: 'rep-3',
          type: 'replace',
          startLine: 3,
          endLine: 3,
          newText: 'replaced\n',
        });

        manager.rejectAll();

        expect(editor.getModel().getValue()).toBe(original);
      });

      it('restores original content after two insert proposals', () => {
        const original = 'line1\nline2\nline3';
        const editor = createRealisticMockEditor(original);
        manager.initialize(editor);

        // Insert before line 2 → ["line1", "inserted_a", "line2", "line3"]
        manager.proposeChange({
          proposalId: 'ins-2',
          type: 'insert',
          startLine: 2,
          newText: 'inserted_a\n',
        });
        // Insert before line 4 → ["line1", "inserted_a", "line2", "inserted_b", "line3"]
        manager.proposeChange({
          proposalId: 'ins-4',
          type: 'insert',
          startLine: 4,
          newText: 'inserted_b\n',
        });

        manager.rejectAll();

        expect(editor.getModel().getValue()).toBe(original);
      });

      it('restores original content after replace-then-delete proposals', () => {
        const original = 'line1\nline2\nline3\nline4\nline5';
        const editor = createRealisticMockEditor(original);
        manager.initialize(editor);

        // Replace line 2 → ["line1", "replaced_line2", "line3", "line4", "line5"]
        manager.proposeChange({
          proposalId: 'rep-2',
          type: 'replace',
          startLine: 2,
          endLine: 2,
          newText: 'replaced_line2\n',
        });
        // Delete line 4 → ["line1", "replaced_line2", "line3", "line5"]
        manager.proposeChange({
          proposalId: 'del-4',
          type: 'delete',
          startLine: 4,
          endLine: 4,
          newText: '',
        });

        manager.rejectAll();

        expect(editor.getModel().getValue()).toBe(original);
      });

      it('restores original content after two consecutive delete proposals', () => {
        const original = 'line1\nline2\nline3\nline4\nline5';
        const editor = createRealisticMockEditor(original);
        manager.initialize(editor);

        // Delete line 2 → ["line1", "line3", "line4", "line5"]
        manager.proposeChange({
          proposalId: 'del-2',
          type: 'delete',
          startLine: 2,
          endLine: 2,
          newText: '',
        });
        // Delete line 3 (was "line4") → ["line1", "line3", "line5"]
        manager.proposeChange({
          proposalId: 'del-3',
          type: 'delete',
          startLine: 3,
          endLine: 3,
          newText: '',
        });

        manager.rejectAll();

        expect(editor.getModel().getValue()).toBe(original);
      });

      it('restores original content with mixed insert, delete, and replace proposals', () => {
        const original = 'line1\nline2\nline3\nline4\nline5\nline6';
        const editor = createRealisticMockEditor(original);
        manager.initialize(editor);

        // Insert before line 1 → ["inserted", "line1", ..., "line6"]
        manager.proposeChange({
          proposalId: 'ins-1',
          type: 'insert',
          startLine: 1,
          newText: 'inserted\n',
        });
        // Delete line 4 (was "line3") → ["inserted", "line1", "line2", "line4", "line5", "line6"]
        manager.proposeChange({
          proposalId: 'del-4',
          type: 'delete',
          startLine: 4,
          endLine: 4,
          newText: '',
        });
        // Replace line 5 (was "line5") → ["inserted", "line1", "line2", "line4", "replaced", "line6"]
        manager.proposeChange({
          proposalId: 'rep-5',
          type: 'replace',
          startLine: 5,
          endLine: 5,
          newText: 'replaced\n',
        });

        manager.rejectAll();

        expect(editor.getModel().getValue()).toBe(original);
      });

      it('correctly undoes a single delete proposal', () => {
        const original = 'line1\nline2\nline3';
        const editor = createRealisticMockEditor(original);
        manager.initialize(editor);

        // Delete line 2 → ["line1", "line3"]
        manager.proposeChange({
          proposalId: 'del-2',
          type: 'delete',
          startLine: 2,
          endLine: 2,
          newText: '',
        });

        manager.rejectAll();

        expect(editor.getModel().getValue()).toBe(original);
      });
    });

    describe('revertAllSilently', () => {
      it('restores original content after delete-then-replace proposals', () => {
        const original = 'line1\nline2\nline3\nline4\nline5';
        const editor = createRealisticMockEditor(original);
        manager.initialize(editor);

        manager.proposeChange({
          proposalId: 'del-2',
          type: 'delete',
          startLine: 2,
          endLine: 2,
          newText: '',
        });
        manager.proposeChange({
          proposalId: 'rep-3',
          type: 'replace',
          startLine: 3,
          endLine: 3,
          newText: 'replaced\n',
        });

        manager.revertAllSilently();

        expect(editor.getModel().getValue()).toBe(original);
      });

      it('restores original content with mixed proposals', () => {
        const original = 'line1\nline2\nline3\nline4\nline5\nline6';
        const editor = createRealisticMockEditor(original);
        manager.initialize(editor);

        manager.proposeChange({
          proposalId: 'ins-1',
          type: 'insert',
          startLine: 1,
          newText: 'inserted\n',
        });
        manager.proposeChange({
          proposalId: 'del-4',
          type: 'delete',
          startLine: 4,
          endLine: 4,
          newText: '',
        });
        manager.proposeChange({
          proposalId: 'rep-5',
          type: 'replace',
          startLine: 5,
          endLine: 5,
          newText: 'replaced\n',
        });

        manager.revertAllSilently();

        expect(editor.getModel().getValue()).toBe(original);
      });

      it('returns all reverted proposal ids', () => {
        const original = 'line1\nline2\nline3';
        const editor = createRealisticMockEditor(original);
        manager.initialize(editor);

        manager.proposeChange({
          proposalId: 'ins-2',
          type: 'insert',
          startLine: 2,
          newText: 'inserted\n',
        });
        manager.proposeChange({
          proposalId: 'rep-3',
          type: 'replace',
          startLine: 3,
          endLine: 3,
          newText: 'replaced\n',
        });

        const reverted = manager.revertAllSilently();

        expect(reverted).toHaveLength(2);
        expect(reverted).toContain('ins-2');
        expect(reverted).toContain('rep-3');
      });
    });
  });
});
