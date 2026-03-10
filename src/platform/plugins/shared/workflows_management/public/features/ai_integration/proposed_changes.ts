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
  /** Line where the undo range ends (inclusive for replace/delete, exclusive col-1 for insert) */
  undoEndLine: number;
  /** Column where the undo range ends */
  undoEndColumn: number;
  /** How many lines the new content occupies in the model (0 for delete) */
  newContentLineCount: number;
}

export interface ProposalManagerOptions {
  onAccept?: (proposalId: string) => void;
  onReject?: (proposalId: string) => void;
}

export class ProposalManager {
  private proposals = new Map<string, PendingProposal>();
  private editor: monaco.editor.IStandaloneCodeEditor | null = null;
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;
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

    const model = this.editor.getModel();
    if (!model) return;

    const originalContent = this.getOriginalContent(change);

    const endLine = change.endLine ?? change.startLine;
    const endColumn = change.endLine ? model.getLineMaxColumn(endLine) : 1;
    const lineCountBefore = model.getLineCount();

    this.editor.pushUndoStop();
    model.pushEditOperations(
      null,
      [
        {
          range: new monaco.Range(change.startLine, 1, endLine, endColumn),
          text: change.newText,
        },
      ],
      () => null
    );
    this.editor.pushUndoStop();

    const linesDelta = model.getLineCount() - lineCountBefore;
    const origLineSpan = change.type === 'insert' ? 0 : endLine - change.startLine + 1;
    const newContentLineCount = origLineSpan + linesDelta;

    let undoEndLine: number;
    let undoEndColumn: number;

    if (change.type === 'insert') {
      undoEndLine = change.startLine + linesDelta;
      undoEndColumn = 1;
    } else {
      undoEndLine = change.startLine + Math.max(newContentLineCount - 1, 0);
      undoEndColumn = model.getLineMaxColumn(undoEndLine);
    }

    const { viewZoneId, decorationIds } = this.showProposalUI(
      change,
      originalContent,
      newContentLineCount
    );

    this.proposals.set(change.proposalId, {
      ...change,
      originalContent,
      viewZoneId,
      decorationIds,
      undoEndLine,
      undoEndColumn,
      newContentLineCount,
    });

    this.editor.revealLineInCenter(change.startLine);
  }

  acceptProposal(proposalId: string): void {
    const proposal = this.proposals.get(proposalId);
    if (!proposal || !this.editor) return;

    this.clearProposal(proposalId);
    this.options.onAccept?.(proposalId);
  }

  rejectProposal(proposalId: string): void {
    const proposal = this.proposals.get(proposalId);
    if (!proposal || !this.editor) return;

    const model = this.editor.getModel();
    if (!model) return;

    this.editor.pushUndoStop();
    model.pushEditOperations(
      null,
      [
        {
          range: new monaco.Range(
            proposal.startLine,
            1,
            proposal.undoEndLine,
            proposal.undoEndColumn
          ),
          text: proposal.originalContent,
        },
      ],
      () => null
    );
    this.editor.pushUndoStop();

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

  private showProposalUI(
    change: ProposedChange,
    originalContent: string,
    newContentLineCount: number
  ): {
    viewZoneId: string;
    decorationIds: string[];
  } {
    const editor = this.editor;
    if (!editor) return { viewZoneId: '', decorationIds: [] };

    const wrapper = document.createElement('div');
    wrapper.className = 'wfDiffWrapper';

    const container = document.createElement('div');
    container.className = 'wfDiffContainer';

    const fontInfo = editor.getOption(monaco.editor.EditorOption.fontInfo);
    container.style.fontFamily = fontInfo.fontFamily;
    container.style.fontSize = `${fontInfo.fontSize}px`;
    container.style.lineHeight = `${fontInfo.lineHeight}px`;
    container.style.letterSpacing = `${fontInfo.letterSpacing}px`;
    container.style.fontWeight = fontInfo.fontWeight;

    wrapper.appendChild(container);

    const originalLines = originalContent ? originalContent.split('\n') : [];
    const hasOriginalContent =
      change.type !== 'insert' && originalLines.length > 0 && originalContent !== '';

    if (hasOriginalContent) {
      const codeContainer = document.createElement('div');
      codeContainer.className = 'wfDiffCodeContainer';
      container.appendChild(codeContainer);

      const editorModel = editor.getModel();
      const languageId = editorModel?.getLanguageId() ?? 'yaml';
      const tempModel = monaco.editor.createModel(originalContent, languageId);

      originalLines.forEach((_, index) => {
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

    const afterLineNumber = change.startLine - 1;
    const heightInLines = hasOriginalContent ? originalLines.length : 1;

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
    if (newContentLineCount > 0 && change.type !== 'delete') {
      const newDecorations: monaco.editor.IModelDeltaDecoration[] = [];
      const decoEndLine = change.startLine + newContentLineCount - 1;
      for (let line = change.startLine; line <= decoEndLine; line++) {
        newDecorations.push({
          range: new monaco.Range(line, 1, line, 1),
          options: {
            isWholeLine: true,
            className: 'wfDiffLineAddBg',
            glyphMarginClassName: 'wfDiffGlyphAdd',
          },
        });
      }

      const collection = editor.createDecorationsCollection(newDecorations);
      this.decorationCollections.set(change.proposalId, collection);
    }

    return { viewZoneId, decorationIds };
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

    this.proposals.delete(proposalId);
  }
}
