/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';

export interface ProposedChange {
  proposalId: string;
  type: 'insert' | 'replace' | 'delete';
  startLine: number;
  endLine?: number;
  newText: string;
}

export interface PendingProposal extends ProposedChange {
  originalContent: string;
  viewZoneId: string;
  decorationIds: string[];
}

export interface ProposalManagerOptions {
  onAccept?: (proposalId: string) => void;
  onReject?: (proposalId: string) => void;
}

export class ProposalManager {
  private proposals = new Map<string, PendingProposal>();
  private editor: monaco.editor.IStandaloneCodeEditor | null = null;
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private undoTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private undoListeners = new Map<string, monaco.IDisposable>();
  private decorationCollections = new Map<string, monaco.editor.IEditorDecorationsCollection>();
  private options: ProposalManagerOptions = {};

  initialize(editor: monaco.editor.IStandaloneCodeEditor, options?: ProposalManagerOptions): void {
    this.editor = editor;
    this.options = options ?? {};

    const domNode = editor.getDomNode();
    if (domNode) {
      this.keydownHandler = (e: KeyboardEvent) => {
        if (!this.hasPendingProposals()) return;

        const nearest = this.findNearestProposal();
        if (!nearest) return;

        if (e.key === 'Tab' || e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          this.acceptProposal(nearest.proposalId);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          this.rejectProposal(nearest.proposalId);
        }
      };

      domNode.addEventListener('keydown', this.keydownHandler, true);
    }
  }

  proposeChange(change: ProposedChange): void {
    if (!this.editor) return;

    const originalContent = this.getOriginalContent(change);
    const { viewZoneId, decorationIds } = this.showProposalUI(change);

    this.proposals.set(change.proposalId, {
      ...change,
      originalContent,
      viewZoneId,
      decorationIds,
    });

    this.editor.revealLineInCenter(change.startLine);
  }

  acceptProposal(proposalId: string): void {
    const proposal = this.proposals.get(proposalId);
    if (!proposal || !this.editor) return;

    const model = this.editor.getModel();
    if (!model) return;

    const contentBefore = this.getOriginalContent(proposal);

    const endLine = proposal.endLine ?? proposal.startLine;
    const endColumn = proposal.endLine ? model.getLineMaxColumn(endLine) : 1;

    this.editor.pushUndoStop();
    model.pushEditOperations(
      null,
      [
        {
          range: new monaco.Range(proposal.startLine, 1, endLine, endColumn),
          text: proposal.newText,
        },
      ],
      () => null
    );
    this.editor.pushUndoStop();

    this.clearProposal(proposalId);
    this.options.onAccept?.(proposalId);
    this.setupUndoDetection(proposalId, contentBefore, proposal);
  }

  rejectProposal(proposalId: string): void {
    if (!this.proposals.has(proposalId)) return;

    this.clearProposal(proposalId);
    this.options.onReject?.(proposalId);
  }

  acceptAll(): void {
    const ids = Array.from(this.proposals.keys());
    for (const id of ids) {
      this.acceptProposal(id);
    }
  }

  rejectAll(): void {
    const ids = Array.from(this.proposals.keys());
    for (const id of ids) {
      this.rejectProposal(id);
    }
  }

  getPendingProposals(): PendingProposal[] {
    return Array.from(this.proposals.values());
  }

  hasPendingProposals(): boolean {
    return this.proposals.size > 0;
  }

  dispose(): void {
    this.rejectAll();

    if (this.editor && this.keydownHandler) {
      const domNode = this.editor.getDomNode();
      if (domNode) {
        domNode.removeEventListener('keydown', this.keydownHandler, true);
      }
    }

    for (const timer of this.undoTimers.values()) {
      clearTimeout(timer);
    }
    this.undoTimers.clear();

    for (const listener of this.undoListeners.values()) {
      listener.dispose();
    }
    this.undoListeners.clear();

    for (const collection of this.decorationCollections.values()) {
      collection.clear();
    }
    this.decorationCollections.clear();

    this.keydownHandler = null;
    this.editor = null;
  }

  private findNearestProposal(): PendingProposal | null {
    if (!this.editor || this.proposals.size === 0) return null;

    const cursorLine = this.editor.getPosition()?.lineNumber ?? 1;
    let nearest: PendingProposal | null = null;
    let minDistance = Infinity;

    for (const proposal of this.proposals.values()) {
      const distance = Math.abs(proposal.startLine - cursorLine);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = proposal;
      }
    }

    return nearest;
  }

  private getOriginalContent(change: ProposedChange): string {
    const model = this.editor?.getModel();
    if (!model) return '';

    if (change.type === 'insert') return '';

    const endLine = change.endLine ?? change.startLine;
    const endColumn = model.getLineMaxColumn(endLine);
    return model.getValueInRange(new monaco.Range(change.startLine, 1, endLine, endColumn));
  }

  private showProposalUI(change: ProposedChange): {
    viewZoneId: string;
    decorationIds: string[];
  } {
    const editor = this.editor;
    const wrapper = document.createElement('div');
    wrapper.className = 'wfDiffWrapper';

    const container = document.createElement('div');
    container.className = 'wfDiffContainer';

    if (editor) {
      const fontInfo = editor.getOption(monaco.editor.EditorOption.fontInfo);
      container.style.fontFamily = fontInfo.fontFamily;
      container.style.fontSize = `${fontInfo.fontSize}px`;
      container.style.lineHeight = `${fontInfo.lineHeight}px`;
      container.style.letterSpacing = `${fontInfo.letterSpacing}px`;
      container.style.fontWeight = fontInfo.fontWeight;
    }

    wrapper.appendChild(container);

    const lines = change.newText ? change.newText.split('\n') : [];

    if (lines.length > 0) {
      const codeContainer = document.createElement('div');
      codeContainer.className = 'wfDiffCodeContainer';
      container.appendChild(codeContainer);

      const editorModel = editor?.getModel();
      const languageId = editorModel?.getLanguageId() ?? 'yaml';
      const tempModel = monaco.editor.createModel(change.newText, languageId);

      lines.forEach((_, index) => {
        const lineDiv = document.createElement('div');
        lineDiv.className = 'wfDiffLine';

        const lineContent = document.createElement('span');
        lineContent.className = 'wfDiffLineContent';
        const colorizedHtml = monaco.editor.colorizeModelLine(
          tempModel,
          index + 1,
          editorModel?.getOptions().tabSize ?? 2
        );
        const parsed = new DOMParser().parseFromString(colorizedHtml, 'text/html');
        while (parsed.body.firstChild) {
          lineContent.appendChild(parsed.body.firstChild);
        }

        lineDiv.appendChild(lineContent);
        codeContainer.appendChild(lineDiv);
      });

      tempModel.dispose();
    }

    const pill = document.createElement('div');
    pill.className = 'wfDiffButtonsPill';

    const acceptButton = document.createElement('button');
    acceptButton.className = 'wfDiffAcceptBtn';
    acceptButton.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 8.5l3 3 5-6.5"/></svg>' +
      '<span>Accept</span>' +
      '<kbd>Tab</kbd>';
    acceptButton.addEventListener('mousedown', (e) => e.stopPropagation());
    acceptButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.acceptProposal(change.proposalId);
    });
    pill.appendChild(acceptButton);

    const declineButton = document.createElement('button');
    declineButton.className = 'wfDiffDeclineBtn';
    declineButton.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4.5 4.5l7 7M11.5 4.5l-7 7"/></svg>' +
      '<span>Decline</span>' +
      '<kbd>Esc</kbd>';
    declineButton.addEventListener('mousedown', (e) => e.stopPropagation());
    declineButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.rejectProposal(change.proposalId);
    });
    pill.appendChild(declineButton);

    wrapper.appendChild(pill);

    const afterLineNumber =
      change.type === 'insert' ? change.startLine - 1 : change.endLine ?? change.startLine;
    const heightInLines = Math.max(lines.length, 1);

    if (!editor) return { viewZoneId: '', decorationIds: [] };

    let viewZoneId = '';
    editor.changeViewZones((accessor) => {
      viewZoneId = accessor.addZone({
        afterLineNumber,
        heightInLines,
        domNode: wrapper,
        suppressMouseDown: true,
      });
    });

    const decorationIds: string[] = [];
    if (change.type === 'replace' || change.type === 'delete') {
      const endLine = change.endLine ?? change.startLine;
      const newDecorations: monaco.editor.IModelDeltaDecoration[] = [];
      for (let line = change.startLine; line <= endLine; line++) {
        newDecorations.push({
          range: new monaco.Range(line, 1, line, 1),
          options: {
            isWholeLine: true,
            className: 'wfDiffLineDeleteBg',
            glyphMarginClassName: 'wfDiffGlyphDelete',
          },
        });
      }

      const collection = editor.createDecorationsCollection(newDecorations);
      this.decorationCollections.set(change.proposalId, collection);
    }

    return { viewZoneId, decorationIds };
  }

  private setupUndoDetection(
    proposalId: string,
    contentBefore: string,
    change: ProposedChange
  ): void {
    const model = this.editor?.getModel();
    if (!model) return;

    const timer = setTimeout(() => {
      this.undoListeners.get(proposalId)?.dispose();
      this.undoListeners.delete(proposalId);
      this.undoTimers.delete(proposalId);
    }, 10_000);

    this.undoTimers.set(proposalId, timer);

    const listener = model.onDidChangeContent(() => {
      const endLine = change.endLine ?? change.startLine;
      const currentEndLine = Math.min(endLine, model.getLineCount());
      const endColumn = model.getLineMaxColumn(currentEndLine);
      const currentContent = model.getValueInRange(
        new monaco.Range(change.startLine, 1, currentEndLine, endColumn)
      );

      if (currentContent === contentBefore) {
        listener.dispose();
        this.undoListeners.delete(proposalId);
        clearTimeout(timer);
        this.undoTimers.delete(proposalId);
        this.proposeChange(change);
      }
    });

    this.undoListeners.set(proposalId, listener);
  }

  private clearProposal(proposalId: string): void {
    const proposal = this.proposals.get(proposalId);
    if (!proposal || !this.editor) return;

    const collection = this.decorationCollections.get(proposalId);
    if (collection) {
      collection.clear();
      this.decorationCollections.delete(proposalId);
    }

    this.editor.changeViewZones((accessor) => {
      accessor.removeZone(proposal.viewZoneId);
    });

    const timer = this.undoTimers.get(proposalId);
    if (timer) {
      clearTimeout(timer);
      this.undoTimers.delete(proposalId);
    }

    const listener = this.undoListeners.get(proposalId);
    if (listener) {
      listener.dispose();
      this.undoListeners.delete(proposalId);
    }

    this.proposals.delete(proposalId);
  }
}
