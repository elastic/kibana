/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { monaco } from '@kbn/monaco';

/**
 * Callback type for when the user submits an edit instruction
 * Returns a promise that resolves when the edit is complete
 */
export type InlineEditSubmitCallback = (
  instruction: string,
  selectedText: string
) => Promise<void> | void;

/**
 * InlineEditInputManager - Manages a Cursor-like inline edit input
 * that appears at the current selection in the Monaco editor
 */
export class InlineEditInputManager {
  private editor: monaco.editor.IStandaloneCodeEditor | null = null;
  private viewZoneId: string | null = null;
  private inputElement: HTMLInputElement | null = null;
  private statusElement: HTMLElement | null = null;
  private containerElement: HTMLElement | null = null;
  private currentSelection: monaco.Selection | null = null;
  private currentSelectedText: string = '';
  private onSubmit: InlineEditSubmitCallback | null = null;
  private decorationIds: string[] = [];
  private keyDownHandler: ((e: KeyboardEvent) => void) | null = null;
  private isProcessing: boolean = false;

  /**
   * Initialize the manager with a Monaco editor instance
   */
  initialize(editor: monaco.editor.IStandaloneCodeEditor): void {
    this.editor = editor;
  }

  /**
   * Show the inline edit input at the current selection
   */
  show(
    selection: monaco.Selection,
    selectedText: string,
    onSubmit: InlineEditSubmitCallback
  ): void {
    if (!this.editor) {
      console.warn('[InlineEditInputManager] Editor not initialized');
      return;
    }

    // Close any existing input first
    this.hide();

    this.currentSelection = selection;
    this.currentSelectedText = selectedText;
    this.onSubmit = onSubmit;

    // Add decoration to highlight the selection
    this.decorationIds = this.editor.deltaDecorations([], [
      {
        range: selection,
        options: {
          className: 'inline-edit-selection-highlight',
          isWholeLine: false,
        },
      },
    ]);

    // Create the view zone with the input
    this.editor.changeViewZones((accessor) => {
      const domNode = this.createInputUI();

      const viewZone: monaco.editor.IViewZone = {
        afterLineNumber: selection.startLineNumber - 1,
        heightInPx: 120, // Increased height for the improved design
        domNode,
        suppressMouseDown: false,
      };

      this.viewZoneId = accessor.addZone(viewZone);
    });

    // Focus the input after a short delay to ensure it's rendered
    setTimeout(() => {
      this.inputElement?.focus();
    }, 50);
  }

  /**
   * Hide and cleanup the inline edit input
   */
  hide(): void {
    if (!this.editor) return;

    // Remove view zone
    if (this.viewZoneId) {
      this.editor.changeViewZones((accessor) => {
        if (this.viewZoneId) {
          accessor.removeZone(this.viewZoneId);
          this.viewZoneId = null;
        }
      });
    }

    // Remove decorations
    if (this.decorationIds.length > 0) {
      this.editor.deltaDecorations(this.decorationIds, []);
      this.decorationIds = [];
    }

    // Remove keyboard handler
    if (this.keyDownHandler) {
      document.removeEventListener('keydown', this.keyDownHandler);
      this.keyDownHandler = null;
    }

    this.inputElement = null;
    this.statusElement = null;
    this.containerElement = null;
    this.currentSelection = null;
    this.currentSelectedText = '';
    this.onSubmit = null;
    this.isProcessing = false;

    // Return focus to editor
    this.editor.focus();
  }

  /**
   * Check if the input is currently visible
   */
  isVisible(): boolean {
    return this.viewZoneId !== null;
  }

  /**
   * Create the input UI DOM elements
   */
  private createInputUI(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'inline-edit-container';
    this.containerElement = container;

    // Prevent Monaco from stealing mouse events and focus input when clicking container
    // Use capture phase to intercept events before Monaco gets them
    const handleMouseEvent = (e: MouseEvent) => {
      e.stopPropagation();
      e.stopImmediatePropagation();
    };

    container.addEventListener('mousedown', handleMouseEvent, true);
    container.addEventListener('mouseup', handleMouseEvent, true);
    container.addEventListener('click', (e) => {
      e.stopPropagation();
      e.stopImmediatePropagation();
      // Focus the input when clicking anywhere in the container (except close button)
      if (this.inputElement && !(e.target as HTMLElement).closest('.inline-edit-close-btn')) {
        this.inputElement.focus();
      }
    }, true);

    // Also handle pointer events which Monaco might use
    container.addEventListener('pointerdown', handleMouseEvent, true);
    container.addEventListener('pointerup', handleMouseEvent, true);

    // Header section
    const header = document.createElement('div');
    header.className = 'inline-edit-header';

    const leftSection = document.createElement('div');
    leftSection.className = 'inline-edit-header-left';

    const iconSpan = document.createElement('span');
    iconSpan.className = 'inline-edit-icon';
    iconSpan.textContent = '✨';

    const titleSpan = document.createElement('span');
    titleSpan.className = 'inline-edit-title';
    titleSpan.textContent = i18n.translate('workflows.inlineEdit.title', {
      defaultMessage: 'Edit with AI',
    });

    leftSection.appendChild(iconSpan);
    leftSection.appendChild(titleSpan);

    // Close button
    const closeButton = document.createElement('button');
    closeButton.className = 'inline-edit-close-btn';
    closeButton.type = 'button';
    closeButton.textContent = '×';
    closeButton.title = i18n.translate('workflows.inlineEdit.close', {
      defaultMessage: 'Close (Esc)',
    });
    closeButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.hide();
    });

    header.appendChild(leftSection);
    header.appendChild(closeButton);

    // Input wrapper
    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'inline-edit-input-wrapper';

    // Input field
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'inline-edit-input';
    input.placeholder = i18n.translate('workflows.inlineEdit.placeholder', {
      defaultMessage: 'Describe the changes you want to make to the selected code...',
    });
    input.autocomplete = 'off';
    input.spellcheck = false;
    // Force remove any borders/outlines that might be added by global styles
    input.style.border = 'none';
    input.style.outline = 'none';
    input.style.boxShadow = 'none';

    // Store reference
    this.inputElement = input;

    // Handle input events
    input.addEventListener('keydown', (e) => {
      e.stopPropagation(); // Prevent Monaco from capturing
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSubmit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.hide();
      }
    });

    // Prevent editor from capturing all input events
    input.addEventListener('keyup', (e) => e.stopPropagation());
    input.addEventListener('keypress', (e) => e.stopPropagation());
    input.addEventListener('input', (e) => e.stopPropagation());
    input.addEventListener('focus', (e) => e.stopPropagation());
    input.addEventListener('blur', (e) => e.stopPropagation());

    // Click on wrapper should focus the input
    inputWrapper.addEventListener('click', (e) => {
      e.stopPropagation();
      input.focus();
    });

    inputWrapper.appendChild(input);

    // Footer with hints and status
    const footer = document.createElement('div');
    footer.className = 'inline-edit-footer';

    const hintSpan = document.createElement('span');
    hintSpan.className = 'inline-edit-hint';

    // Create hint with kbd elements
    const enterHint = document.createElement('span');
    const enterKbd = document.createElement('kbd');
    enterKbd.textContent = '↵ Enter';
    enterHint.appendChild(enterKbd);
    enterHint.appendChild(document.createTextNode(' to generate'));

    const escHint = document.createElement('span');
    const escKbd = document.createElement('kbd');
    escKbd.textContent = 'Esc';
    escHint.appendChild(escKbd);
    escHint.appendChild(document.createTextNode(' to cancel'));

    hintSpan.appendChild(enterHint);
    hintSpan.appendChild(escHint);

    // Status element for showing progress
    const statusSpan = document.createElement('span');
    statusSpan.className = 'inline-edit-status';
    this.statusElement = statusSpan;

    footer.appendChild(hintSpan);
    footer.appendChild(statusSpan);

    // Assemble container
    container.appendChild(header);
    container.appendChild(inputWrapper);
    container.appendChild(footer);

    // Global escape key handler (in case focus is elsewhere)
    this.keyDownHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.isVisible()) {
        e.preventDefault();
        e.stopPropagation();
        this.hide();
      }
    };
    document.addEventListener('keydown', this.keyDownHandler, true); // Use capture phase

    return container;
  }

  /**
   * Update the status display
   */
  updateStatus(status: string): void {
    if (this.statusElement) {
      this.statusElement.textContent = status;
    }
  }

  /**
   * Show loading state
   */
  private showLoading(): void {
    this.isProcessing = true;
    if (this.inputElement) {
      this.inputElement.disabled = true;
      this.inputElement.style.opacity = '0.5';
    }
    if (this.containerElement) {
      this.containerElement.classList.add('inline-edit-loading');
    }
  }

  /**
   * Hide loading state
   */
  private hideLoading(): void {
    this.isProcessing = false;
    if (this.inputElement) {
      this.inputElement.disabled = false;
      this.inputElement.style.opacity = '1';
    }
    if (this.containerElement) {
      this.containerElement.classList.remove('inline-edit-loading');
    }
  }

  /**
   * Handle submit of the edit instruction
   */
  private async handleSubmit(): Promise<void> {
    const instruction = this.inputElement?.value.trim();
    if (!instruction || !this.onSubmit || this.isProcessing) {
      if (!this.isProcessing) {
        this.hide();
      }
      return;
    }

    const selectedText = this.currentSelectedText;
    const callback = this.onSubmit;

    // Show loading state
    this.showLoading();
    this.updateStatus('Processing...');

    try {
      // Execute the callback (may be async)
      await callback(instruction, selectedText);
      // Small delay to ensure proposed changes UI is rendered before we remove our view zone
      await new Promise((resolve) => setTimeout(resolve, 100));
      // On success, hide the inline edit to make room for the proposed changes UI
      this.hide();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[InlineEditInput] Submit error:', error);
      this.updateStatus('Error occurred');
      // Wait a bit to show the error, then hide
      await new Promise((resolve) => setTimeout(resolve, 2000));
      this.hide();
    }
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.hide();
    this.editor = null;
  }
}

/**
 * CSS styles for the inline edit input
 * Note: Styles are now defined in global_workflow_editor_styles.tsx
 */
export const INLINE_EDIT_STYLES = '';
