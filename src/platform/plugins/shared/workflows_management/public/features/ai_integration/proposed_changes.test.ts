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

  return {
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
  } as any;
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
});
