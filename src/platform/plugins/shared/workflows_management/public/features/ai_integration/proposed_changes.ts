/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';

const ICON_SVG_CHECK =
  '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 8.5l3 3 5-6.5"/></svg>';
const ICON_SVG_CROSS =
  '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4.5 4.5l7 7M11.5 4.5l-7 7"/></svg>';
const ICON_SVG_ARROW_UP =
  '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 12V4M4 7l4-4 4 4"/></svg>';
const ICON_SVG_ARROW_DOWN =
  '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 4v8M4 9l4 4 4-4"/></svg>';

const parseSvgIcon = (svgMarkup: string): Node =>
  new DOMParser().parseFromString(svgMarkup, 'image/svg+xml').documentElement;

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
  pillZoneId: string;
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
  private bulkBar: HTMLDivElement | null = null;
  private bulkBarSpacerZoneId: string | null = null;
  private focusedProposalId: string | null = null;
  private pillElements = new Map<string, HTMLDivElement>();

  private mouseMoveDisposable: monaco.IDisposable | null = null;
  private contentChangeDisposable: monaco.IDisposable | null = null;
  private mouseMoveRafId: ReturnType<typeof requestAnimationFrame> | null = null;
  private sortedProposals: Array<{ id: string; startLine: number; endLine: number }> = [];

  /**
   * Guard flag: true while proposeChange / rejectProposal / revertAllSilently
   * are modifying the model. Allows the onDidChangeContent listener to
   * distinguish internal edits from external ones (undo, user typing).
   */
  private isInternalEdit = false;

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

    this.mouseMoveDisposable = editor.onMouseMove((e) => {
      if (!this.hasPendingProposals()) return;
      const lineNumber = e.target.position?.lineNumber;
      if (lineNumber == null) return;

      if (this.mouseMoveRafId != null) cancelAnimationFrame(this.mouseMoveRafId);
      this.mouseMoveRafId = requestAnimationFrame(() => {
        this.mouseMoveRafId = null;
        const id = this.findProposalAtLine(lineNumber);
        if (id != null && this.focusedProposalId !== id) {
          this.focusProposal(id);
        }
      });
    });

    const model = editor.getModel();
    if (model) {
      this.contentChangeDisposable = model.onDidChangeContent(() => {
        if (!this.isInternalEdit && this.hasPendingProposals()) {
          this.dismissAll();
        }
      });
    }
  }

  proposeChange(change: ProposedChange): void {
    if (!this.editor) return;

    const model = this.editor.getModel();
    if (!model) return;

    const originalContent = this.getOriginalContent(change);

    const endLine = change.endLine ?? change.startLine;
    let rangeEndLine: number;
    let rangeEndColumn: number;

    if (change.type === 'insert') {
      rangeEndLine = change.startLine;
      rangeEndColumn = 1;
    } else if (endLine < model.getLineCount()) {
      rangeEndLine = endLine + 1;
      rangeEndColumn = 1;
    } else {
      rangeEndLine = endLine;
      rangeEndColumn = model.getLineMaxColumn(endLine);
    }

    const lineCountBefore = model.getLineCount();

    this.isInternalEdit = true;
    this.editor.pushUndoStop();
    model.pushEditOperations(
      null,
      [
        {
          range: new monaco.Range(change.startLine, 1, rangeEndLine, rangeEndColumn),
          text: change.newText,
        },
      ],
      () => null
    );
    this.editor.pushUndoStop();
    this.isInternalEdit = false;

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

    const { viewZoneId, pillZoneId, decorationIds } = this.showProposalUI(
      change,
      originalContent,
      newContentLineCount
    );

    this.proposals.set(change.proposalId, {
      ...change,
      originalContent,
      viewZoneId,
      pillZoneId,
      decorationIds,
      undoEndLine,
      undoEndColumn,
      newContentLineCount,
    });

    this.rebuildSortedIndex();
    this.editor.revealLineInCenter(change.startLine);
    this.focusedProposalId = this.getSortedProposalIds()[0] ?? null;
    this.updatePillVisibility();
    this.updateBulkBar();
  }

  acceptProposal(proposalId: string): void {
    const proposal = this.proposals.get(proposalId);
    if (!proposal || !this.editor) return;

    this.clearProposal(proposalId);
    this.options.onAccept?.(proposalId);
    this.updatePillVisibility();
    this.updateBulkBar();
  }

  rejectProposal(proposalId: string): void {
    const proposal = this.proposals.get(proposalId);
    if (!proposal || !this.editor) return;

    const model = this.editor.getModel();
    if (!model) return;

    this.isInternalEdit = true;
    this.editor.pushUndoStop();
    if (proposal.newContentLineCount === 0) {
      model.pushEditOperations(
        null,
        [
          {
            range: new monaco.Range(proposal.startLine, 1, proposal.startLine, 1),
            text: `${proposal.originalContent}\n`,
          },
        ],
        () => null
      );
    } else {
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
    }
    this.editor.pushUndoStop();
    this.isInternalEdit = false;

    this.clearProposal(proposalId);
    this.options.onReject?.(proposalId);
    this.updatePillVisibility();
    this.updateBulkBar();
  }

  acceptOverlapping(startLine: number, endLine: number): void {
    for (const [id, proposal] of this.proposals.entries()) {
      if (proposal.startLine <= endLine && startLine <= proposal.undoEndLine) {
        this.acceptProposal(id);
      }
    }
  }

  acceptAll(): void {
    const ids = Array.from(this.proposals.keys());
    for (const id of ids) {
      this.acceptProposal(id);
    }
  }

  rejectAll(): void {
    const ids = Array.from(this.proposals.keys()).reverse();
    for (const id of ids) {
      this.rejectProposal(id);
    }
  }

  /**
   * Revert all pending proposals: restore original content in the model
   * and remove decorations/view zones, without firing onAccept/onReject
   * callbacks. Used when a new event supersedes existing proposals and
   * needs a clean model state. Returns the proposalIds that were reverted.
   */
  revertAllSilently(): string[] {
    if (!this.editor || this.proposals.size === 0) return [];

    const model = this.editor.getModel();
    if (!model) return [];

    this.isInternalEdit = true;
    this.editor.pushUndoStop();

    const ids = Array.from(this.proposals.keys()).reverse();
    const reverted: string[] = [];

    for (const id of ids) {
      const proposal = this.proposals.get(id);
      if (proposal) {
        if (proposal.newContentLineCount === 0) {
          model.pushEditOperations(
            null,
            [
              {
                range: new monaco.Range(proposal.startLine, 1, proposal.startLine, 1),
                text: `${proposal.originalContent}\n`,
              },
            ],
            () => null
          );
        } else {
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
        }

        this.clearProposal(id);
        reverted.push(id);
      }
    }

    this.editor.pushUndoStop();
    this.isInternalEdit = false;
    this.updatePillVisibility();
    this.updateBulkBar();

    return reverted;
  }

  getPendingProposals(): PendingProposal[] {
    return Array.from(this.proposals.values());
  }

  hasPendingProposals(): boolean {
    return this.proposals.size > 0;
  }

  /**
   * Clear all pending proposal UI (decorations + view zones) and fire
   * onReject for each, without modifying the model. Used when an external
   * change (undo, user typing) invalidates the proposals in-place.
   */
  private dismissAll(): void {
    const ids = Array.from(this.proposals.keys());
    for (const id of ids) {
      this.clearProposal(id);
      this.options.onReject?.(id);
    }
    this.updatePillVisibility();
    this.updateBulkBar();
  }

  dispose(): void {
    this.rejectAll();
    this.removeBulkBar();

    this.mouseMoveDisposable?.dispose();
    this.mouseMoveDisposable = null;
    if (this.mouseMoveRafId != null) {
      cancelAnimationFrame(this.mouseMoveRafId);
      this.mouseMoveRafId = null;
    }
    this.contentChangeDisposable?.dispose();
    this.contentChangeDisposable = null;

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
    this.pillElements.clear();

    this.keydownHandler = null;
    this.editor = null;
  }

  private updateBulkBar(): void {
    if (this.proposals.size === 0) {
      this.removeBulkBar();
      return;
    }
    if (!this.bulkBar) {
      this.createBulkBar();
    }
  }

  private createBulkBar(): void {
    const editorDom = this.editor?.getDomNode();
    const container = editorDom?.parentElement;
    if (!container) return;

    container.style.position = 'relative';

    const bar = document.createElement('div');
    bar.className = 'wfDiffBulkBar';

    const acceptAllBtn = document.createElement('button');
    acceptAllBtn.className = 'wfDiffAcceptBtn';
    acceptAllBtn.appendChild(parseSvgIcon(ICON_SVG_CHECK));
    const acceptAllLabel = document.createElement('span');
    acceptAllLabel.textContent = 'Accept all';
    acceptAllBtn.appendChild(acceptAllLabel);
    const acceptKbd = document.createElement('kbd');
    acceptKbd.textContent = 'Tab';
    acceptAllBtn.appendChild(acceptKbd);
    acceptAllBtn.addEventListener('mousedown', (e) => e.stopPropagation());
    acceptAllBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.acceptAll();
    });
    bar.appendChild(acceptAllBtn);

    const rejectAllBtn = document.createElement('button');
    rejectAllBtn.className = 'wfDiffDeclineBtn';
    rejectAllBtn.appendChild(parseSvgIcon(ICON_SVG_CROSS));
    const rejectAllLabel = document.createElement('span');
    rejectAllLabel.textContent = 'Decline all';
    rejectAllBtn.appendChild(rejectAllLabel);
    const rejectKbd = document.createElement('kbd');
    rejectKbd.textContent = 'Esc';
    rejectAllBtn.appendChild(rejectKbd);
    rejectAllBtn.addEventListener('mousedown', (e) => e.stopPropagation());
    rejectAllBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.rejectAll();
    });
    bar.appendChild(rejectAllBtn);

    container.appendChild(bar);
    this.bulkBar = bar;

    if (this.editor) {
      const model = this.editor.getModel();
      const lastLine = model?.getLineCount() ?? 1;
      this.editor.changeViewZones((accessor) => {
        const spacer = document.createElement('div');
        this.bulkBarSpacerZoneId = accessor.addZone({
          afterLineNumber: lastLine,
          heightInPx: 44,
          domNode: spacer,
        });
      });
    }
  }

  private removeBulkBar(): void {
    if (this.bulkBar) {
      this.bulkBar.remove();
      this.bulkBar = null;

      if (this.editor && this.bulkBarSpacerZoneId) {
        const zoneId = this.bulkBarSpacerZoneId;
        this.editor.changeViewZones((accessor) => {
          accessor.removeZone(zoneId);
        });
        this.bulkBarSpacerZoneId = null;
      }
    }
  }

  private getSortedProposalIds(): string[] {
    return this.sortedProposals.map((entry) => entry.id);
  }

  private rebuildSortedIndex(): void {
    this.sortedProposals = Array.from(this.proposals.entries())
      .map(([id, p]) => ({
        id,
        startLine: p.startLine,
        endLine: p.startLine + p.newContentLineCount - 1,
      }))
      .sort((a, b) => a.startLine - b.startLine);
  }

  // Binary search to find the proposal at the given line number
  private findProposalAtLine(lineNumber: number): string | null {
    const arr = this.sortedProposals;
    let lo = 0;
    let hi = arr.length - 1;

    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      const entry = arr[mid];
      if (lineNumber < entry.startLine) {
        hi = mid - 1;
      } else if (lineNumber > entry.endLine) {
        lo = mid + 1;
      } else {
        return entry.id;
      }
    }
    return null;
  }

  private focusProposal(proposalId: string): void {
    this.focusedProposalId = proposalId;
    this.updatePillVisibility();
  }

  private navigateProposal(direction: 'up' | 'down'): void {
    const sorted = this.getSortedProposalIds();
    if (sorted.length === 0) return;

    const currentIdx = this.focusedProposalId ? sorted.indexOf(this.focusedProposalId) : -1;
    let nextIdx: number;
    if (direction === 'up') {
      nextIdx = currentIdx <= 0 ? sorted.length - 1 : currentIdx - 1;
    } else {
      nextIdx = currentIdx >= sorted.length - 1 ? 0 : currentIdx + 1;
    }

    const nextId = sorted[nextIdx];
    this.focusProposal(nextId);

    const proposal = this.proposals.get(nextId);
    if (proposal && this.editor) {
      this.editor.revealLineInCenter(proposal.startLine);
    }
  }

  private updatePillVisibility(): void {
    const sorted = this.getSortedProposalIds();

    if (
      sorted.length > 0 &&
      (!this.focusedProposalId || !this.proposals.has(this.focusedProposalId))
    ) {
      this.focusedProposalId = sorted[0];
    }

    const focusedIdx = this.focusedProposalId ? sorted.indexOf(this.focusedProposalId) : 0;

    for (const [id, pill] of this.pillElements.entries()) {
      const isFocused = id === this.focusedProposalId;
      pill.style.display = isFocused ? 'flex' : 'none';

      if (isFocused) {
        const counter = pill.querySelector('.wfDiffNavCounter') as HTMLSpanElement | null;
        if (counter) {
          counter.textContent = `${focusedIdx + 1} of ${sorted.length}`;
        }

        const navSection = pill.querySelector('.wfDiffNavSection') as HTMLElement | null;
        if (navSection) {
          navSection.style.display = sorted.length > 1 ? 'flex' : 'none';
        }
      }
    }
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
    pillZoneId: string;
    decorationIds: string[];
  } {
    const editor = this.editor;
    if (!editor) return { viewZoneId: '', pillZoneId: '', decorationIds: [] };

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
        lineDiv.style.height = `${fontInfo.lineHeight}px`;

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

    const pillWrapper = document.createElement('div');
    pillWrapper.className = 'wfDiffPillWrapper';

    const pill = document.createElement('div');
    pill.className = 'wfDiffButtonsPill';
    pill.style.display = 'none';

    const navSection = document.createElement('div');
    navSection.className = 'wfDiffNavSection';

    const upButton = document.createElement('button');
    upButton.className = 'wfDiffNavBtn';
    upButton.appendChild(parseSvgIcon(ICON_SVG_ARROW_UP));
    upButton.addEventListener('mousedown', (e) => e.stopPropagation());
    upButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.navigateProposal('up');
    });
    navSection.appendChild(upButton);

    const counter = document.createElement('span');
    counter.className = 'wfDiffNavCounter';
    counter.textContent = '1 of 1';
    navSection.appendChild(counter);

    const downButton = document.createElement('button');
    downButton.className = 'wfDiffNavBtn';
    downButton.appendChild(parseSvgIcon(ICON_SVG_ARROW_DOWN));
    downButton.addEventListener('mousedown', (e) => e.stopPropagation());
    downButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.navigateProposal('down');
    });
    navSection.appendChild(downButton);

    pill.appendChild(navSection);

    const acceptButton = document.createElement('button');
    acceptButton.className = 'wfDiffAcceptBtn';
    acceptButton.appendChild(parseSvgIcon(ICON_SVG_CHECK));
    const acceptLabel = document.createElement('span');
    acceptLabel.textContent = 'Accept';
    acceptButton.appendChild(acceptLabel);
    const acceptKbd = document.createElement('kbd');
    acceptKbd.textContent = 'Tab';
    acceptButton.appendChild(acceptKbd);
    acceptButton.addEventListener('mousedown', (e) => e.stopPropagation());
    acceptButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.acceptProposal(change.proposalId);
    });
    pill.appendChild(acceptButton);

    const declineButton = document.createElement('button');
    declineButton.className = 'wfDiffDeclineBtn';
    declineButton.appendChild(parseSvgIcon(ICON_SVG_CROSS));
    const declineLabel = document.createElement('span');
    declineLabel.textContent = 'Decline';
    declineButton.appendChild(declineLabel);
    const declineKbd = document.createElement('kbd');
    declineKbd.textContent = 'Esc';
    declineButton.appendChild(declineKbd);
    declineButton.addEventListener('mousedown', (e) => e.stopPropagation());
    declineButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.rejectProposal(change.proposalId);
    });
    pill.appendChild(declineButton);

    this.pillElements.set(change.proposalId, pill);

    pillWrapper.appendChild(pill);

    const afterLineNumber = change.startLine - 1;
    const heightInLines = hasOriginalContent ? originalLines.length : 0;

    const pillAfterLine = change.startLine + Math.max(newContentLineCount - 1, 0);

    let viewZoneId = '';
    let pillZoneId = '';
    editor.changeViewZones((accessor) => {
      if (heightInLines > 0) {
        viewZoneId = accessor.addZone({
          afterLineNumber,
          heightInLines,
          domNode: wrapper,
          suppressMouseDown: true,
        });
      }

      pillZoneId = accessor.addZone({
        afterLineNumber: pillAfterLine,
        heightInPx: 28,
        domNode: pillWrapper,
        suppressMouseDown: true,
      });
    });

    wrapper.addEventListener('mouseenter', () => {
      this.focusProposal(change.proposalId);
    });
    pillWrapper.addEventListener('mouseenter', () => {
      this.focusProposal(change.proposalId);
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
          },
        });
      }

      const collection = editor.createDecorationsCollection(newDecorations);
      this.decorationCollections.set(change.proposalId, collection);
    }

    return { viewZoneId, pillZoneId, decorationIds };
  }

  private clearProposal(proposalId: string): void {
    const proposal = this.proposals.get(proposalId);
    if (!proposal || !this.editor) return;

    const collection = this.decorationCollections.get(proposalId);
    if (collection) {
      collection.clear();
      this.decorationCollections.delete(proposalId);
    }

    this.pillElements.delete(proposalId);

    this.editor.changeViewZones((accessor) => {
      if (proposal.viewZoneId) {
        accessor.removeZone(proposal.viewZoneId);
      }
      if (proposal.pillZoneId) {
        accessor.removeZone(proposal.pillZoneId);
      }
    });

    this.proposals.delete(proposalId);
    this.rebuildSortedIndex();
  }
}
