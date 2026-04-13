/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { diffLines } from 'diff';
import { getUndoRedoService, monaco } from '@kbn/monaco';
import type { UndoRedoService } from '@kbn/monaco';
import { isMac } from '@kbn/shared-ux-utility';

// EUI: check
const ICON_SVG_CHECK =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M15.354 4.354 6.5 13.207 1.646 8.354l.708-.708L6.5 11.793l8.146-8.147.708.708Z" clip-rule="evenodd"></path></svg>';
// EUI: cross
const ICON_SVG_CROSS =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M7.293 8 2.646 3.354l.708-.708L8 7.293l4.646-4.647.708.708L8.707 8l4.647 4.646-.707.708L8 8.707l-4.646 4.647-.708-.707L7.293 8Z" clip-rule="evenodd"></path></svg>';
// EUI: chevronSingleUp
const ICON_SVG_ARROW_UP =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="m8 5.707 5.646 5.647.708-.708L8 4.293l-6.354 6.353.708.707L8 5.708Z" clip-rule="evenodd"></path></svg>';
// EUI: chevronSingleDown
const ICON_SVG_ARROW_DOWN =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="m8 10.293 5.646-5.647.708.708L8 11.707 1.646 5.354l.708-.708L8 10.293Z" clip-rule="evenodd"></path></svg>';

const parseSvgIcon = (svgMarkup: string): Node =>
  new DOMParser().parseFromString(svgMarkup, 'image/svg+xml').documentElement;

const normalizeTrailing = (s: string) => `${s.trimEnd()}\n`;

export interface DiffHunk {
  index: number;
  type: 'insert' | 'replace' | 'delete';
  originalStartLine: number;
  originalEndLine: number;
  modifiedStartLine: number;
  modifiedEndLine: number;
  originalContent: string;
  modifiedContent: string;
}

export interface ProposalManagerOptions {
  onAccept?: (context: { proposalId: string; isBulkAction: boolean }) => void;
  onReject?: (context: { proposalId: string; isBulkAction: boolean }) => void;
  onHunkAccepted?: (hunkIndex: number) => void;
  onHunkRejected?: (hunkIndex: number) => void;
}

interface HunkUIState {
  viewZoneId: string;
  pillZoneId: string;
  collection: monaco.editor.IEditorDecorationsCollection | null;
  pillElement: HTMLDivElement;
}

export class ProposalManager {
  private editor: monaco.editor.IStandaloneCodeEditor | null = null;
  private originalModel: monaco.editor.ITextModel | null = null;
  private diffHunks: DiffHunk[] = [];
  private hunkUI: HunkUIState[] = [];
  private options: ProposalManagerOptions = {};
  private bulkBar: HTMLDivElement | null = null;
  private bulkBarSpacerZoneId: string | null = null;
  private focusedHunkIndex = -1;

  /** True while the pointer is over the Monaco surface or the bulk-action bar (no editor focus required). */
  private pointerInsideHotkeySurface = false;
  private editorSurfaceElement: HTMLElement | null = null;
  private proposalHotkeyHandler: ((e: KeyboardEvent) => void) | null = null;

  private readonly onEditorSurfaceEnter = (): void => {
    this.pointerInsideHotkeySurface = true;
  };

  private readonly onEditorSurfaceLeave = (e: MouseEvent): void => {
    this.updatePointerInsideHotkeySurfaceFromLeave(e.relatedTarget);
  };

  private readonly onBulkBarSurfaceEnter = (): void => {
    this.pointerInsideHotkeySurface = true;
  };

  private readonly onBulkBarSurfaceLeave = (e: MouseEvent): void => {
    this.updatePointerInsideHotkeySurfaceFromLeave(e.relatedTarget);
  };

  private updatePointerInsideHotkeySurfaceFromLeave(relatedTarget: EventTarget | null): void {
    const editorDom = this.editorSurfaceElement;
    const bar = this.bulkBar;
    if (relatedTarget instanceof Node) {
      if (editorDom?.contains(relatedTarget)) return;
      if (bar?.contains(relatedTarget)) return;
    }
    this.pointerInsideHotkeySurface = false;
  }

  private mouseMoveDisposable: monaco.IDisposable | null = null;
  private cursorPositionDisposable: monaco.IDisposable | null = null;
  private contentChangeDisposable: monaco.IDisposable | null = null;
  private mouseMoveRafId: ReturnType<typeof requestAnimationFrame> | null = null;
  private isInternalEdit = false;
  private isBulkOperation = false;
  private undoRedoService: UndoRedoService | undefined;
  private isDisposing = false;

  initialize(editor: monaco.editor.IStandaloneCodeEditor, options?: ProposalManagerOptions): void {
    this.editor = editor;
    this.options = options ?? {};

    this.mouseMoveDisposable = editor.onMouseMove((e) => {
      if (!this.hasPendingProposals()) return;
      const lineNumber = e.target.position?.lineNumber;
      if (lineNumber == null) return;

      if (this.mouseMoveRafId != null) cancelAnimationFrame(this.mouseMoveRafId);
      this.mouseMoveRafId = requestAnimationFrame(() => {
        this.mouseMoveRafId = null;
        const idx = this.findHunkAtLine(lineNumber);
        if (idx >= 0 && this.focusedHunkIndex !== idx) {
          this.focusHunk(idx);
        }
      });
    });

    this.cursorPositionDisposable = editor.onDidChangeCursorPosition((e) => {
      if (!this.hasPendingProposals()) return;
      const idx = this.findHunkAtLine(e.position.lineNumber);
      if (idx >= 0 && this.focusedHunkIndex !== idx) {
        this.focusHunk(idx);
      }
    });

    const domNode = editor.getDomNode();
    if (domNode) {
      this.editorSurfaceElement = domNode;
      domNode.addEventListener('mouseenter', this.onEditorSurfaceEnter);
      domNode.addEventListener('mouseleave', this.onEditorSurfaceLeave);
    }

    this.proposalHotkeyHandler = (e: KeyboardEvent) => {
      if (!this.hasPendingProposals() || !this.pointerInsideHotkeySurface) return;

      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (!mod || e.altKey) return;

      // Accept all: Cmd/Ctrl + Shift + A
      if (e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        e.stopPropagation();
        this.acceptAll();
        return;
      }

      // Decline all: Cmd/Ctrl + Backspace (no Shift)
      if (!e.shiftKey && e.key === 'Backspace') {
        e.preventDefault();
        e.stopPropagation();
        this.rejectAll();
      }
    };
    document.addEventListener('keydown', this.proposalHotkeyHandler, true);

    this.undoRedoService = getUndoRedoService();

    const model = editor.getModel();
    if (model) {
      this.originalModel = monaco.editor.createModel(model.getValue(), model.getLanguageId());

      this.contentChangeDisposable = model.onDidChangeContent(() => {
        if (this.isInternalEdit) return;

        if (this.hasPendingProposals()) {
          this.recomputeDiff();
          this.renderDiffUI();
        } else if (this.originalModel) {
          this.originalModel.setValue(model.getValue());
        }
      });
    }
  }

  applyAfterYaml(afterYaml: string): void {
    if (!this.editor) return;

    const model = this.editor.getModel();
    if (!model) return;

    if (!this.originalModel) {
      this.originalModel = monaco.editor.createModel(model.getValue(), model.getLanguageId());
    }

    const before = normalizeTrailing(model.getValue());
    const after = normalizeTrailing(afterYaml);

    if (before === after) {
      this.clearAllHunkUI();
      this.diffHunks = [];
      this.removeBulkBar();
      return;
    }

    this.isInternalEdit = true;
    this.editor.pushUndoStop();
    const lastLine = model.getLineCount();
    const lastCol = model.getLineMaxColumn(lastLine);
    model.pushEditOperations(
      null,
      [{ range: new monaco.Range(1, 1, lastLine, lastCol), text: afterYaml }],
      () => null
    );
    this.editor.pushUndoStop();
    this.isInternalEdit = false;

    this.recomputeDiff();
    this.renderDiffUI();
  }

  acceptHunk(hunkIndex: number): void {
    const hunk = this.diffHunks[hunkIndex];
    if (!hunk || !this.originalModel) return;

    const model = this.editor?.getModel();
    if (!model) return;

    const prevOrigValue = this.originalModel.getValue();
    const origLines = prevOrigValue.split('\n');
    const modLines = model.getValue().split('\n');

    const newOrigLines = [
      ...origLines.slice(0, hunk.originalStartLine - 1),
      ...modLines.slice(hunk.modifiedStartLine - 1, hunk.modifiedEndLine - 1),
      ...origLines.slice(hunk.originalEndLine - 1),
    ];
    const newOrigValue = newOrigLines.join('\n');
    this.originalModel.setValue(newOrigValue);

    if (!this.isBulkOperation) {
      this.options.onHunkAccepted?.(hunkIndex);
    }

    this.recomputeDiff();
    this.renderDiffUI();

    if (!this.hasPendingProposals() && !this.isBulkOperation) {
      this.options.onAccept?.({ proposalId: 'all', isBulkAction: false });
    }

    if (this.undoRedoService && !this.isDisposing) {
      this.undoRedoService.pushElement({
        type: 0 as const,
        resource: model.uri,
        label: 'Accept Hunk',
        code: 'undoredo.proposalAcceptHunk',
        undo: () => {
          this.originalModel?.setValue(prevOrigValue);
          this.recomputeDiff();
          this.renderDiffUI();
        },
        redo: () => {
          this.originalModel?.setValue(newOrigValue);
          this.recomputeDiff();
          this.renderDiffUI();
        },
      });
    }
  }

  rejectHunk(hunkIndex: number): void {
    const hunk = this.diffHunks[hunkIndex];
    if (!hunk || !this.editor || !this.originalModel) return;

    const model = this.editor.getModel();
    if (!model) return;

    const origLines = this.originalModel.getValue().split('\n');
    const modLines = model.getValue().split('\n');

    const newModLines = [
      ...modLines.slice(0, hunk.modifiedStartLine - 1),
      ...origLines.slice(hunk.originalStartLine - 1, hunk.originalEndLine - 1),
      ...modLines.slice(hunk.modifiedEndLine - 1),
    ];

    this.isInternalEdit = true;
    const lastLine = model.getLineCount();
    const lastCol = model.getLineMaxColumn(lastLine);
    let inverseOps = model.applyEdits(
      [{ range: new monaco.Range(1, 1, lastLine, lastCol), text: newModLines.join('\n') }],
      true
    );
    this.isInternalEdit = false;

    if (!this.isBulkOperation) {
      this.options.onHunkRejected?.(hunkIndex);
    }

    this.recomputeDiff();
    this.renderDiffUI();

    if (!this.hasPendingProposals() && !this.isBulkOperation) {
      this.options.onReject?.({ proposalId: 'all', isBulkAction: false });
    }

    if (this.undoRedoService && !this.isDisposing && inverseOps) {
      this.undoRedoService.pushElement({
        type: 0 as const,
        resource: model.uri,
        label: 'Reject Hunk',
        code: 'undoredo.proposalRejectHunk',
        undo: () => {
          this.isInternalEdit = true;
          inverseOps = model.applyEdits(inverseOps, true);
          this.isInternalEdit = false;
          this.recomputeDiff();
          this.renderDiffUI();
        },
        redo: () => {
          this.isInternalEdit = true;
          inverseOps = model.applyEdits(inverseOps, true);
          this.isInternalEdit = false;
          this.recomputeDiff();
          this.renderDiffUI();
        },
      });
    }
  }

  acceptAll(): void {
    if (!this.originalModel || !this.editor) return;

    this.isBulkOperation = true;
    while (this.diffHunks.length > 0) {
      this.acceptHunk(0);
    }
    this.isBulkOperation = false;
    this.options.onAccept?.({ proposalId: 'all', isBulkAction: true });
  }

  rejectAll(): void {
    if (!this.originalModel || !this.editor) return;

    this.isBulkOperation = true;
    while (this.diffHunks.length > 0) {
      this.rejectHunk(0);
    }
    this.isBulkOperation = false;
    this.options.onReject?.({ proposalId: 'all', isBulkAction: true });
  }

  getDiffHunks(): DiffHunk[] {
    return this.diffHunks;
  }

  hasPendingProposals(): boolean {
    return this.diffHunks.length > 0;
  }

  dispose(): void {
    this.isDisposing = true;
    this.rejectAll();
    this.removeBulkBar();

    this.originalModel?.dispose();
    this.originalModel = null;
    this.diffHunks = [];

    this.mouseMoveDisposable?.dispose();
    this.mouseMoveDisposable = null;
    if (this.mouseMoveRafId != null) {
      cancelAnimationFrame(this.mouseMoveRafId);
      this.mouseMoveRafId = null;
    }
    this.cursorPositionDisposable?.dispose();
    this.cursorPositionDisposable = null;
    this.contentChangeDisposable?.dispose();
    this.contentChangeDisposable = null;

    if (this.editorSurfaceElement) {
      this.editorSurfaceElement.removeEventListener('mouseenter', this.onEditorSurfaceEnter);
      this.editorSurfaceElement.removeEventListener('mouseleave', this.onEditorSurfaceLeave);
      this.editorSurfaceElement = null;
    }

    if (this.proposalHotkeyHandler) {
      document.removeEventListener('keydown', this.proposalHotkeyHandler, true);
      this.proposalHotkeyHandler = null;
    }

    this.clearAllHunkUI();

    this.editor = null;
  }

  private recomputeDiff(): void {
    if (!this.originalModel || !this.editor) {
      this.diffHunks = [];
      return;
    }

    const model = this.editor.getModel();
    if (!model) {
      this.diffHunks = [];
      return;
    }

    const originalContent = normalizeTrailing(this.originalModel.getValue());
    const modifiedContent = normalizeTrailing(model.getValue());

    if (originalContent === modifiedContent) {
      this.diffHunks = [];
      return;
    }

    const parts = diffLines(originalContent, modifiedContent);
    const hunks: DiffHunk[] = [];
    let origLine = 1;
    let modLine = 1;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const lineCount = part.count ?? 0;

      if (!part.added && !part.removed) {
        origLine += lineCount;
        modLine += lineCount;
      } else if (part.removed) {
        const next = parts[i + 1];
        if (next?.added) {
          const nextCount = next.count ?? 0;
          hunks.push({
            index: hunks.length,
            type: 'replace',
            originalStartLine: origLine,
            originalEndLine: origLine + lineCount,
            modifiedStartLine: modLine,
            modifiedEndLine: modLine + nextCount,
            originalContent: part.value,
            modifiedContent: next.value,
          });
          origLine += lineCount;
          modLine += nextCount;
          i++;
        } else {
          hunks.push({
            index: hunks.length,
            type: 'delete',
            originalStartLine: origLine,
            originalEndLine: origLine + lineCount,
            modifiedStartLine: modLine,
            modifiedEndLine: modLine,
            originalContent: part.value,
            modifiedContent: '',
          });
          origLine += lineCount;
        }
      } else if (part.added) {
        hunks.push({
          index: hunks.length,
          type: 'insert',
          originalStartLine: origLine,
          originalEndLine: origLine,
          modifiedStartLine: modLine,
          modifiedEndLine: modLine + lineCount,
          originalContent: '',
          modifiedContent: part.value,
        });
        modLine += lineCount;
      }
    }

    this.diffHunks = hunks;
  }

  private renderDiffUI(): void {
    this.clearAllHunkUI();

    if (!this.editor || this.diffHunks.length === 0) {
      this.removeBulkBar();
      return;
    }

    for (let i = 0; i < this.diffHunks.length; i++) {
      this.renderHunkUI(this.diffHunks[i], i);
    }

    this.focusedHunkIndex = 0;
    this.updatePillVisibility();
    this.updateBulkBar();

    if (this.diffHunks.length > 0) {
      this.editor.revealLineInCenter(this.diffHunks[0].modifiedStartLine);
    }
  }

  private renderHunkUI(hunk: DiffHunk, hunkIndex: number): void {
    const editor = this.editor;
    if (!editor) return;

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

    const originalLines = hunk.originalContent ? hunk.originalContent.trimEnd().split('\n') : [];
    const hasOriginalContent = hunk.type !== 'insert' && originalLines.length > 0;

    if (hasOriginalContent) {
      const codeContainer = document.createElement('div');
      codeContainer.className = 'wfDiffCodeContainer';
      container.appendChild(codeContainer);

      const editorModel = editor.getModel();
      const languageId = editorModel?.getLanguageId() ?? 'yaml';
      const tempModel = monaco.editor.createModel(hunk.originalContent.trimEnd(), languageId);

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
    pill.setAttribute('data-test-subj', 'wfDiffProposalPill');
    pill.style.display = 'none';

    const navSection = document.createElement('div');
    navSection.className = 'wfDiffNavSection';

    const upButton = document.createElement('button');
    upButton.className = 'wfDiffNavBtn';
    upButton.setAttribute('data-test-subj', 'wfDiffNavUpButton');
    upButton.appendChild(parseSvgIcon(ICON_SVG_ARROW_UP));
    upButton.addEventListener('mousedown', (e) => e.stopPropagation());
    upButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.navigateHunk('up');
    });
    navSection.appendChild(upButton);

    const counter = document.createElement('span');
    counter.className = 'wfDiffNavCounter';
    counter.textContent = '1 of 1';
    navSection.appendChild(counter);

    const downButton = document.createElement('button');
    downButton.className = 'wfDiffNavBtn';
    downButton.setAttribute('data-test-subj', 'wfDiffNavDownButton');
    downButton.appendChild(parseSvgIcon(ICON_SVG_ARROW_DOWN));
    downButton.addEventListener('mousedown', (e) => e.stopPropagation());
    downButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.navigateHunk('down');
    });
    navSection.appendChild(downButton);

    pill.appendChild(navSection);

    const acceptButton = document.createElement('button');
    acceptButton.className = 'wfDiffAcceptBtn';
    acceptButton.setAttribute('data-test-subj', 'wfDiffAcceptButton');
    acceptButton.appendChild(parseSvgIcon(ICON_SVG_CHECK));
    const acceptLabel = document.createElement('span');
    acceptLabel.textContent = 'Accept';
    acceptButton.appendChild(acceptLabel);
    acceptButton.addEventListener('mousedown', (e) => e.stopPropagation());
    acceptButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.acceptHunk(hunkIndex);
    });
    pill.appendChild(acceptButton);

    const declineButton = document.createElement('button');
    declineButton.className = 'wfDiffDeclineBtn';
    declineButton.setAttribute('data-test-subj', 'wfDiffDeclineButton');
    declineButton.appendChild(parseSvgIcon(ICON_SVG_CROSS));
    const declineLabel = document.createElement('span');
    declineLabel.textContent = 'Decline';
    declineButton.appendChild(declineLabel);
    declineButton.addEventListener('mousedown', (e) => e.stopPropagation());
    declineButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.rejectHunk(hunkIndex);
    });
    pill.appendChild(declineButton);

    pillWrapper.appendChild(pill);

    const afterLineNumber = hunk.modifiedStartLine - 1;
    const heightInLines = hasOriginalContent ? originalLines.length : 0;
    const modifiedLineCount = hunk.modifiedEndLine - hunk.modifiedStartLine;
    const pillAfterLine = Math.max(
      hunk.modifiedStartLine + modifiedLineCount - 1,
      hunk.modifiedStartLine
    );

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
        // use zero height, so pill is floating above the code
        heightInPx: 0,
        domNode: pillWrapper,
        suppressMouseDown: true,
      });
    });

    wrapper.addEventListener('mouseenter', () => {
      this.focusHunk(hunkIndex);
    });
    pillWrapper.addEventListener('mouseenter', () => {
      this.focusHunk(hunkIndex);
    });

    let collection: monaco.editor.IEditorDecorationsCollection | null = null;
    if (modifiedLineCount > 0 && hunk.type !== 'delete') {
      const newDecorations: monaco.editor.IModelDeltaDecoration[] = [];
      for (let line = hunk.modifiedStartLine; line < hunk.modifiedEndLine; line++) {
        newDecorations.push({
          range: new monaco.Range(line, 1, line, 1),
          options: {
            isWholeLine: true,
            className: 'wfDiffLineAddBg',
          },
        });
      }
      collection = editor.createDecorationsCollection(newDecorations);
    }

    this.hunkUI.push({ viewZoneId, pillZoneId, collection, pillElement: pill });
  }

  private clearAllHunkUI(): void {
    if (!this.editor) return;

    const zoneIds: string[] = [];
    for (const ui of this.hunkUI) {
      if (ui.viewZoneId) zoneIds.push(ui.viewZoneId);
      if (ui.pillZoneId) zoneIds.push(ui.pillZoneId);
      ui.collection?.clear();
    }

    if (zoneIds.length > 0) {
      this.editor.changeViewZones((accessor) => {
        for (const id of zoneIds) {
          accessor.removeZone(id);
        }
      });
    }

    this.hunkUI = [];
    this.focusedHunkIndex = -1;
  }

  private findHunkAtLine(lineNumber: number): number {
    for (let i = 0; i < this.diffHunks.length; i++) {
      const hunk = this.diffHunks[i];
      const startLine = hunk.modifiedStartLine;
      const endLine = Math.max(hunk.modifiedEndLine - 1, startLine);
      if (lineNumber >= startLine && lineNumber <= endLine) {
        return i;
      }
    }
    return -1;
  }

  private focusHunk(hunkIndex: number): void {
    this.focusedHunkIndex = hunkIndex;
    this.updatePillVisibility();
  }

  private navigateHunk(direction: 'up' | 'down'): void {
    const count = this.diffHunks.length;
    if (count === 0) return;

    let nextIdx: number;
    if (direction === 'up') {
      nextIdx = this.focusedHunkIndex <= 0 ? count - 1 : this.focusedHunkIndex - 1;
    } else {
      nextIdx = this.focusedHunkIndex >= count - 1 ? 0 : this.focusedHunkIndex + 1;
    }

    this.focusHunk(nextIdx);

    const hunk = this.diffHunks[nextIdx];
    if (hunk && this.editor) {
      this.editor.revealLineInCenter(hunk.modifiedStartLine);
    }
  }

  private updatePillVisibility(): void {
    const count = this.diffHunks.length;

    if (count > 0 && (this.focusedHunkIndex < 0 || this.focusedHunkIndex >= count)) {
      this.focusedHunkIndex = 0;
    }

    for (let i = 0; i < this.hunkUI.length; i++) {
      const ui = this.hunkUI[i];
      const isFocused = i === this.focusedHunkIndex;
      ui.pillElement.style.display = isFocused ? 'flex' : 'none';

      if (isFocused) {
        const counterEl = ui.pillElement.querySelector(
          '.wfDiffNavCounter'
        ) as HTMLSpanElement | null;
        if (counterEl) {
          counterEl.textContent = `${this.focusedHunkIndex + 1} of ${count}`;
        }

        const navSection = ui.pillElement.querySelector('.wfDiffNavSection') as HTMLElement | null;
        if (navSection) {
          navSection.style.display = count > 1 ? 'flex' : 'none';
        }
      }
    }
  }

  private updateBulkBar(): void {
    if (this.diffHunks.length === 0) {
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
    bar.setAttribute('data-test-subj', 'wfDiffBulkBar');

    const acceptAllBtn = document.createElement('button');
    acceptAllBtn.className = 'wfDiffAcceptBtn';
    acceptAllBtn.setAttribute('data-test-subj', 'wfDiffAcceptAllButton');
    acceptAllBtn.appendChild(parseSvgIcon(ICON_SVG_CHECK));
    const acceptAllLabel = document.createElement('span');
    acceptAllLabel.textContent = 'Accept All';
    acceptAllBtn.appendChild(acceptAllLabel);
    const acceptKbd = document.createElement('kbd');
    acceptKbd.textContent = isMac ? '⌘⇧A' : 'Ctrl+Shift+A';
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
    rejectAllBtn.setAttribute('data-test-subj', 'wfDiffDeclineAllButton');
    rejectAllBtn.appendChild(parseSvgIcon(ICON_SVG_CROSS));
    const rejectAllLabel = document.createElement('span');
    rejectAllLabel.textContent = 'Decline All';
    rejectAllBtn.appendChild(rejectAllLabel);
    const rejectKbd = document.createElement('kbd');
    rejectKbd.textContent = isMac ? '⌘⌫' : 'Ctrl+Bksp';
    rejectAllBtn.appendChild(rejectKbd);
    rejectAllBtn.addEventListener('mousedown', (e) => e.stopPropagation());
    rejectAllBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.rejectAll();
    });
    bar.appendChild(rejectAllBtn);

    bar.addEventListener('mouseenter', this.onBulkBarSurfaceEnter);
    bar.addEventListener('mouseleave', this.onBulkBarSurfaceLeave);

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
      this.bulkBar.removeEventListener('mouseenter', this.onBulkBarSurfaceEnter);
      this.bulkBar.removeEventListener('mouseleave', this.onBulkBarSurfaceLeave);
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
}
