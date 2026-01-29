/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '@kbn/monaco';

/**
 * Manages proposed changes in the Monaco editor with a Cursor-like UX.
 * Shows proposed changes as a view zone (inline block) that can be accepted (Tab) or rejected (Escape).
 */
export class ProposedChangesManager {
  private editor: monaco.editor.IStandaloneCodeEditor | null = null;
  private pendingChange: PendingChange | null = null;
  private decorations: string[] = [];
  private viewZoneId: string | null = null;
  private disposables: monaco.IDisposable[] = [];
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private onAcceptCallback?: (change: PendingChange) => void;
  private onRejectCallback?: (change: PendingChange) => void;
  // Track last accepted change for undo detection
  private lastAcceptedChange: PendingChange | null = null;
  private contentBeforeAccept: string | null = null;
  private contentChangeListener: monaco.IDisposable | null = null;

  /**
   * Initialize the manager with an editor instance
   */
  initialize(
    editor: monaco.editor.IStandaloneCodeEditor,
    options?: {
      onAccept?: (change: PendingChange) => void;
      onReject?: (change: PendingChange) => void;
    }
  ): void {
    this.editor = editor;
    this.onAcceptCallback = options?.onAccept;
    this.onRejectCallback = options?.onReject;

    // Use DOM event listener for keyboard handling (more reliable than Monaco actions)
    this.keydownHandler = (e: KeyboardEvent) => {
      if (!this.pendingChange) return;

      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        this.acceptChange();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.rejectChange();
      }
    };

    // Attach to the editor's DOM node
    const editorDomNode = editor.getDomNode();
    if (editorDomNode) {
      editorDomNode.addEventListener('keydown', this.keydownHandler, true);
    }
  }

  /**
   * Propose a change to be shown as ghost text
   */
  proposeChange(change: ProposedChange): void {
    if (!this.editor) {
      // eslint-disable-next-line no-console
      console.warn('[ProposedChangesManager] Editor not initialized');
      return;
    }

    // Clear any existing proposed change
    this.clearProposedChange();

    const model = this.editor.getModel();
    if (!model) return;

    // Store the pending change
    this.pendingChange = {
      ...change,
      originalContent: this.getOriginalContent(change),
    };

    // Show the change as a view zone with accept/reject buttons
    this.showProposedChangeUI(change);

    // Scroll to the change location
    this.editor.revealLineInCenter(change.startLine);
  }

  /**
   * Accept the current proposed change and apply it
   */
  acceptChange(): void {
    if (!this.pendingChange || !this.editor) return;

    const change = this.pendingChange;
    const model = this.editor.getModel();
    if (!model) return;

    // Store the content before accepting for undo detection
    this.contentBeforeAccept = model.getValue();
    this.lastAcceptedChange = { ...change };

    // Clear decorations first
    this.clearProposedChange();

    // Apply the actual edit
    this.editor.pushUndoStop();

    const endLine = change.endLine ?? change.startLine;
    const endColumn = change.endLine ? model.getLineMaxColumn(endLine) : 1;

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

    // Set up listener to detect undo
    this.setupUndoDetection();

    // Notify callback
    this.onAcceptCallback?.(change);
  }

  /**
   * Set up a listener to detect when the user undoes an accepted change
   */
  private setupUndoDetection(): void {
    if (!this.editor) return;

    // Remove any existing listener
    if (this.contentChangeListener) {
      this.contentChangeListener.dispose();
      this.contentChangeListener = null;
    }

    const model = this.editor.getModel();
    if (!model) return;

    this.contentChangeListener = model.onDidChangeContent(() => {
      // Check if content was reverted to pre-accept state
      if (this.contentBeforeAccept && this.lastAcceptedChange) {
        const currentContent = model.getValue();
        if (currentContent === this.contentBeforeAccept) {
          // User undid the change - re-show the proposal
          const changeToRestore = this.lastAcceptedChange;
          this.lastAcceptedChange = null;
          this.contentBeforeAccept = null;

          // Clean up the listener
          if (this.contentChangeListener) {
            this.contentChangeListener.dispose();
            this.contentChangeListener = null;
          }

          // Re-propose the change
          this.proposeChange(changeToRestore);
        }
      }
    });

    // Clear the undo detection after a short period or on any new change
    // to avoid false positives
    setTimeout(() => {
      if (this.contentChangeListener) {
        this.contentChangeListener.dispose();
        this.contentChangeListener = null;
      }
      this.lastAcceptedChange = null;
      this.contentBeforeAccept = null;
    }, 10000); // 10 seconds window to undo
  }

  /**
   * Reject the current proposed change
   */
  rejectChange(): void {
    if (!this.pendingChange) return;

    const change = this.pendingChange;

    // Clear decorations
    this.clearProposedChange();

    // Notify callback
    this.onRejectCallback?.(change);
  }

  /**
   * Check if there's a pending change
   */
  hasPendingChange(): boolean {
    return this.pendingChange !== null;
  }

  /**
   * Get the current pending change
   */
  getPendingChange(): PendingChange | null {
    return this.pendingChange;
  }

  /**
   * Clear all proposed changes and decorations
   */
  clearProposedChange(): void {
    if (this.editor) {
      // Clear decorations
      if (this.decorations.length > 0) {
        this.editor.deltaDecorations(this.decorations, []);
        this.decorations = [];
      }

      // Clear view zone
      if (this.viewZoneId) {
        this.editor.changeViewZones((accessor) => {
          if (this.viewZoneId) {
            accessor.removeZone(this.viewZoneId);
            this.viewZoneId = null;
          }
        });
      }
    }
    this.pendingChange = null;
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.clearProposedChange();
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];

    // Clean up undo detection listener
    if (this.contentChangeListener) {
      this.contentChangeListener.dispose();
      this.contentChangeListener = null;
    }
    this.lastAcceptedChange = null;
    this.contentBeforeAccept = null;

    // Remove keyboard listener
    if (this.keydownHandler && this.editor) {
      const editorDomNode = this.editor.getDomNode();
      if (editorDomNode) {
        editorDomNode.removeEventListener('keydown', this.keydownHandler, true);
      }
    }
    this.keydownHandler = null;
    this.editor = null;
  }

  private getOriginalContent(change: ProposedChange): string {
    if (!this.editor) return '';
    const model = this.editor.getModel();
    if (!model) return '';

    if (change.type === 'insert') {
      return ''; // No original content for insertions
    }

    const endLine = change.endLine ?? change.startLine;
    return model.getValueInRange(
      new monaco.Range(change.startLine, 1, endLine, model.getLineMaxColumn(endLine))
    );
  }

  /**
   * Show the proposed change with a Cursor-like UI
   */
  private showProposedChangeUI(change: ProposedChange): void {
    if (!this.editor) return;

    const model = this.editor.getModel();
    if (!model) return;

    // Filter out empty trailing lines but keep internal empty lines
    const lines = change.newText.split('\n');
    while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
      lines.pop();
    }

    const decorations: monaco.editor.IModelDeltaDecoration[] = [];

    // Bind handlers to preserve 'this' context
    const handleAccept = () => this.acceptChange();
    const handleReject = () => this.rejectChange();

    // Create the view zone with Cursor-like styling
    this.editor.changeViewZones((accessor) => {
      // Outer wrapper
      const wrapper = document.createElement('div');
      wrapper.className = 'cursor-diff-wrapper';

      // Main content container (green gutter bar is rendered via CSS border-left)
      const domNode = document.createElement('div');
      domNode.className = 'cursor-diff-container';

      // Header bar with Accept/Reject buttons (Cursor style)
      const headerBar = document.createElement('div');
      headerBar.className = 'cursor-diff-header';

      const leftSection = document.createElement('div');
      leftSection.className = 'cursor-diff-header-left';

      // Build header content using DOM methods instead of innerHTML
      const iconSpan = document.createElement('span');
      iconSpan.className =
        change.type === 'insert'
          ? 'cursor-diff-icon cursor-diff-icon-add'
          : 'cursor-diff-icon cursor-diff-icon-change';
      iconSpan.textContent = change.type === 'insert' ? '+' : '~';

      const labelSpan = document.createElement('span');
      labelSpan.className = 'cursor-diff-label';
      labelSpan.textContent = change.type === 'insert' ? 'Proposed addition' : 'Proposed change';

      leftSection.appendChild(iconSpan);
      leftSection.appendChild(document.createTextNode(' '));
      leftSection.appendChild(labelSpan);

      const buttonSection = document.createElement('div');
      buttonSection.className = 'cursor-diff-buttons';

      // Accept button
      const acceptBtn = document.createElement('button');
      acceptBtn.className = 'cursor-diff-btn cursor-diff-btn-accept';
      acceptBtn.textContent = '✓ Accept ';
      const acceptKbd = document.createElement('kbd');
      acceptKbd.textContent = 'Tab';
      acceptBtn.appendChild(acceptKbd);
      acceptBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleAccept();
      });

      // Reject button
      const rejectBtn = document.createElement('button');
      rejectBtn.className = 'cursor-diff-btn cursor-diff-btn-reject';
      rejectBtn.textContent = '✕ Reject ';
      const rejectKbd = document.createElement('kbd');
      rejectKbd.textContent = 'Esc';
      rejectBtn.appendChild(rejectKbd);
      rejectBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleReject();
      });

      buttonSection.appendChild(acceptBtn);
      buttonSection.appendChild(rejectBtn);

      headerBar.appendChild(leftSection);
      headerBar.appendChild(buttonSection);
      domNode.appendChild(headerBar);

      // Code content with diff styling
      const codeContainer = document.createElement('div');
      codeContainer.className = 'cursor-diff-code-container';

      // Calculate the starting line number for the new content
      // For inserts, content starts at change.startLine
      // For replacements, content also starts at change.startLine
      const startingLineNumber = change.startLine;

      // Show each line with line numbers and green highlighting
      lines.forEach((line, index) => {
        const lineDiv = document.createElement('div');
        lineDiv.className = 'cursor-diff-line cursor-diff-line-add';

        const lineNumber = document.createElement('span');
        lineNumber.className = 'cursor-diff-line-number';
        // Show the actual line number the content will occupy
        lineNumber.textContent = String(startingLineNumber + index);

        const lineContent = document.createElement('span');
        lineContent.className = 'cursor-diff-line-content';
        lineContent.textContent = line || ' '; // Show space for empty lines

        lineDiv.appendChild(lineNumber);
        lineDiv.appendChild(lineContent);
        codeContainer.appendChild(lineDiv);
      });

      domNode.appendChild(codeContainer);
      wrapper.appendChild(domNode);

      // Calculate height - use fixed line height for consistency
      const lineHeight = 20; // Fixed line height for the diff view
      const headerHeight = 40;
      const codeHeight = Math.max(lines.length, 1) * lineHeight;
      const padding = 12;
      const totalHeight = headerHeight + codeHeight + padding;

      // Set explicit height on the wrapper for absolute positioning of gutter bar
      wrapper.style.height = `${totalHeight}px`;

      this.viewZoneId = accessor.addZone({
        afterLineNumber: change.startLine - 1,
        heightInPx: totalHeight,
        domNode: wrapper,
        suppressMouseDown: false, // Allow clicking buttons
      });
    });

    // For replacements, also mark the lines being replaced
    if (change.type === 'replace' || change.type === 'delete') {
      const endLine = change.endLine ?? change.startLine;
      for (let i = change.startLine; i <= endLine; i++) {
        decorations.push({
          range: new monaco.Range(i, 1, i, 1),
          options: {
            isWholeLine: true,
            className: 'cursor-diff-line-delete-bg',
            glyphMarginClassName: 'cursor-diff-glyph-delete',
          },
        });
      }
    }

    if (decorations.length > 0) {
      this.decorations = this.editor.deltaDecorations([], decorations);
    }
  }
}

export interface ProposedChange {
  /** Type of change */
  type: 'insert' | 'replace' | 'delete';
  /** Starting line number (1-based) */
  startLine: number;
  /** Ending line number for replacements/deletions (1-based, inclusive) */
  endLine?: number;
  /** The new text to insert or replace with */
  newText: string;
  /** Description of the change for the user */
  description?: string;
}

export interface PendingChange extends ProposedChange {
  /** The original content that will be replaced (empty for insertions) */
  originalContent: string;
}

/**
 * CSS styles for the proposed changes decorations.
 * These should be added to the global styles.
 */
export const PROPOSED_CHANGES_STYLES = `
  .proposed-change-ghost-text {
    color: #6e7681;
    font-style: italic;
    opacity: 0.7;
  }

  .proposed-change-line {
    background-color: rgba(46, 160, 67, 0.15);
  }

  .proposed-change-delete-line {
    background-color: rgba(248, 81, 73, 0.15);
    text-decoration: line-through;
    opacity: 0.6;
  }

  .proposed-change-glyph {
    background-color: #2ea043;
    width: 4px !important;
    margin-left: 3px;
  }

  .proposed-change-delete-glyph {
    background-color: #f85149;
    width: 4px !important;
    margin-left: 3px;
  }

  .proposed-change-spacer {
    display: inline-block;
    width: 0;
  }
`;
