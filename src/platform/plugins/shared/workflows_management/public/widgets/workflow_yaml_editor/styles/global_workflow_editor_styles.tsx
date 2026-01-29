/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme } from '@elastic/eui';
import { css, Global } from '@emotion/react';
import React from 'react';
import { getBaseTypeIconsStyles } from './get_base_type_icons_styles';
import { getMonacoWorkflowOverridesStyles } from './get_monaco_workflow_overrides_styles';

/**
 * Styles for the AI proposed changes feature (Cursor-like accept/reject UX)
 */
const getProposedChangesStyles = () => css`
  /* ========== Wrapper with gutter bar ========== */
  .cursor-diff-wrapper {
    display: flex;
    flex-direction: row;
    height: 100%;
    box-sizing: border-box;
  }

  /* Green gutter bar element - hidden, we use border-left on container instead */
  .cursor-diff-gutter-bar {
    display: none;
  }

  /* ========== Cursor-style Diff Container ========== */
  .cursor-diff-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: linear-gradient(to bottom, #1a2e1a 0%, #162816 100%);
    border: 1px solid #2d5a2d;
    border-left: 4px solid #3fb950; /* Green gutter bar as left border */
    border-radius: 4px 6px 6px 4px;
    overflow: hidden;
    font-family: var(
      --monaco-monospace-font,
      'SF Mono',
      'Monaco',
      'Inconsolata',
      'Fira Mono',
      'Droid Sans Mono',
      'Source Code Pro',
      monospace
    );
    font-size: 13px;
    margin-right: 8px;
    min-width: 0; /* Allow flexbox to shrink properly */
  }

  /* Header bar with buttons */
  .cursor-diff-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background-color: rgba(63, 185, 80, 0.1);
    border-bottom: 1px solid #2d5a2d;
  }

  .cursor-diff-header-left {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #3fb950;
    font-size: 12px;
    font-weight: 500;
  }

  .cursor-diff-icon {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 14px;
  }

  .cursor-diff-icon-add {
    background-color: #238636;
    color: #ffffff;
  }

  .cursor-diff-icon-change {
    background-color: #1f6feb;
    color: #ffffff;
  }

  .cursor-diff-label {
    font-weight: 600;
    letter-spacing: 0.3px;
  }

  /* Button container */
  .cursor-diff-buttons {
    display: flex;
    gap: 8px;
  }

  /* Buttons */
  .cursor-diff-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border: none;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
    outline: none;
    pointer-events: auto; /* Ensure clicks work in Monaco view zones */
    user-select: none;
    position: relative;
    z-index: 10;
  }

  .cursor-diff-btn:focus {
    box-shadow: 0 0 0 2px rgba(63, 185, 80, 0.4);
  }

  .cursor-diff-btn:active {
    transform: scale(0.97);
  }

  .cursor-diff-btn kbd {
    background-color: rgba(255, 255, 255, 0.2);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 10px;
    font-family: inherit;
    font-weight: 500;
  }

  .cursor-diff-btn-accept {
    background-color: #238636;
    color: #ffffff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }

  .cursor-diff-btn-accept:hover {
    background-color: #2ea043;
    box-shadow: 0 2px 6px rgba(46, 160, 67, 0.4);
  }

  .cursor-diff-btn-reject {
    background-color: #21262d;
    color: #c9d1d9;
    border: 1px solid #30363d;
  }

  .cursor-diff-btn-reject:hover {
    background-color: #30363d;
    border-color: #8b949e;
  }

  /* Code container */
  .cursor-diff-code-container {
    padding: 4px 0;
  }

  /* Individual diff lines */
  .cursor-diff-line {
    display: flex;
    line-height: 20px;
    min-height: 20px;
  }

  .cursor-diff-line-add {
    background-color: rgba(46, 160, 67, 0.15);
  }

  .cursor-diff-line-number {
    min-width: 48px;
    padding: 0 12px 0 8px;
    text-align: right;
    color: #6e7681; /* Muted color like Monaco's line numbers */
    font-weight: normal;
    font-size: 12px;
    user-select: none;
    flex-shrink: 0;
  }

  .cursor-diff-line-content {
    flex: 1;
    padding: 0 12px 0 0;
    white-space: pre;
    color: #adbac7;
  }

  /* Glyph margin indicators - thicker green bar */
  .cursor-diff-glyph-add {
    background-color: #3fb950 !important;
    width: 4px !important;
    margin-left: 2px !important;
    border-radius: 2px !important;
  }

  .cursor-diff-glyph-delete {
    background-color: #f85149 !important;
    width: 4px !important;
    margin-left: 2px !important;
    border-radius: 2px !important;
  }

  /* Lines being replaced/deleted in the editor */
  .cursor-diff-line-delete-bg {
    background-color: rgba(248, 81, 73, 0.2) !important;
    text-decoration: line-through;
    opacity: 0.6;
  }

  /* ========== Light mode overrides ========== */
  .monaco-editor:not(.vs-dark) .cursor-diff-container {
    background: linear-gradient(to bottom, #dafbe1 0%, #d1f7d9 100%);
    border-color: #a7f3d0;
    border-left-color: #22c55e; /* Green gutter bar in light mode */
  }

  .monaco-editor:not(.vs-dark) .cursor-diff-header {
    background-color: rgba(34, 197, 94, 0.1);
    border-color: #a7f3d0;
  }

  .monaco-editor:not(.vs-dark) .cursor-diff-header-left {
    color: #15803d;
  }

  .monaco-editor:not(.vs-dark) .cursor-diff-icon-add {
    background-color: #22c55e;
  }

  .monaco-editor:not(.vs-dark) .cursor-diff-line-add {
    background-color: rgba(34, 197, 94, 0.12);
  }

  .monaco-editor:not(.vs-dark) .cursor-diff-line-number {
    color: #6b7280; /* Muted gray for line numbers in light mode */
  }

  .monaco-editor:not(.vs-dark) .cursor-diff-line-content {
    color: #1f2937;
  }

  .monaco-editor:not(.vs-dark) .cursor-diff-btn-accept {
    background-color: #22c55e;
  }

  .monaco-editor:not(.vs-dark) .cursor-diff-btn-accept:hover {
    background-color: #16a34a;
  }

  .monaco-editor:not(.vs-dark) .cursor-diff-btn-reject {
    background-color: #f3f4f6;
    color: #374151;
    border-color: #d1d5db;
  }

  .monaco-editor:not(.vs-dark) .cursor-diff-btn-reject:hover {
    background-color: #e5e7eb;
  }

  .monaco-editor:not(.vs-dark) .cursor-diff-btn kbd {
    background-color: rgba(0, 0, 0, 0.08);
  }

  .monaco-editor:not(.vs-dark) .cursor-diff-glyph-add {
    background-color: #22c55e !important;
  }
`;

/**
 * Styles for the inline edit input (Cursor-like Cmd+K edit selection)
 */
const getInlineEditStyles = () => css`
  /* ========== Inline Edit Container ========== */
  .inline-edit-container {
    background: linear-gradient(135deg, #1a1d23 0%, #13151a 100%);
    border: 1px solid rgba(99, 102, 241, 0.3);
    border-radius: 12px;
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: calc(100% - 32px);
    max-width: 800px;
    min-width: 500px;
    margin: 8px 16px;
    box-sizing: border-box;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(99, 102, 241, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
    /* Ensure the container can always receive pointer events */
    pointer-events: auto;
    position: relative;
    z-index: 100;
  }

  .inline-edit-container * {
    pointer-events: auto;
  }

  .inline-edit-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  .inline-edit-header-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .inline-edit-title {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #a78bfa;
  }

  .inline-edit-close-btn {
    background: transparent;
    border: none;
    color: #6b7280;
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    transition: all 0.15s ease;
  }

  .inline-edit-close-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #e5e7eb;
  }

  .inline-edit-input-wrapper {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    background: transparent;
    border: none;
    padding: 4px 0;
    cursor: text;
  }

  .inline-edit-icon {
    font-size: 16px;
    flex-shrink: 0;
    opacity: 0.9;
  }

  .inline-edit-input {
    flex: 1;
    border: none !important;
    outline: none !important;
    box-shadow: none !important;
    background: transparent;
    font-size: 14px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    color: #e5e7eb;
    padding: 8px 0;
    min-width: 300px;
    line-height: 1.5;
    -webkit-appearance: none;
    appearance: none;
  }

  .inline-edit-input:focus {
    border: none !important;
    outline: none !important;
    box-shadow: none !important;
  }

  .inline-edit-input::placeholder {
    color: #6b7280;
  }

  .inline-edit-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 4px;
  }

  .inline-edit-hint {
    font-size: 11px;
    color: #6b7280;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .inline-edit-hint kbd {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 4px;
    padding: 2px 6px;
    font-size: 10px;
    font-family: inherit;
    color: #9ca3af;
  }

  .inline-edit-selection-highlight {
    background-color: rgba(99, 102, 241, 0.2);
    border-left: 2px solid #6366f1;
  }

  .inline-edit-status {
    font-size: 11px;
    color: #a78bfa;
    font-weight: 500;
  }

  .inline-edit-loading .inline-edit-input-wrapper {
    opacity: 0.7;
  }

  .inline-edit-loading .inline-edit-status::before {
    content: '';
    display: inline-block;
    width: 12px;
    height: 12px;
    border: 2px solid #a78bfa;
    border-top-color: transparent;
    border-radius: 50%;
    margin-right: 6px;
    animation: inline-edit-spin 0.8s linear infinite;
    vertical-align: middle;
  }

  @keyframes inline-edit-spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* ========== Light mode overrides ========== */
  .monaco-editor:not(.vs-dark) .inline-edit-container {
    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
    border-color: rgba(99, 102, 241, 0.25);
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(99, 102, 241, 0.15),
      inset 0 1px 0 rgba(255, 255, 255, 0.8);
  }

  .monaco-editor:not(.vs-dark) .inline-edit-header {
    border-bottom-color: rgba(0, 0, 0, 0.06);
  }

  .monaco-editor:not(.vs-dark) .inline-edit-title {
    color: #7c3aed;
  }

  .monaco-editor:not(.vs-dark) .inline-edit-input-wrapper {
    background: rgba(0, 0, 0, 0.02);
    border-color: rgba(0, 0, 0, 0.1);
  }

  .monaco-editor:not(.vs-dark) .inline-edit-input-wrapper:focus-within {
    border-color: #6366f1;
    background: rgba(99, 102, 241, 0.03);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  .monaco-editor:not(.vs-dark) .inline-edit-input {
    color: #1f2937;
  }

  .monaco-editor:not(.vs-dark) .inline-edit-input::placeholder {
    color: #9ca3af;
  }

  .monaco-editor:not(.vs-dark) .inline-edit-hint {
    color: #6b7280;
  }

  .monaco-editor:not(.vs-dark) .inline-edit-hint kbd {
    background: rgba(0, 0, 0, 0.05);
    border-color: rgba(0, 0, 0, 0.1);
    color: #6b7280;
  }

  .monaco-editor:not(.vs-dark) .inline-edit-selection-highlight {
    background-color: rgba(99, 102, 241, 0.12);
    border-left-color: #7c3aed;
  }

  .monaco-editor:not(.vs-dark) .inline-edit-close-btn {
    color: #9ca3af;
  }

  .monaco-editor:not(.vs-dark) .inline-edit-close-btn:hover {
    background: rgba(0, 0, 0, 0.05);
    color: #374151;
  }
`;

export const GlobalWorkflowEditorStyles = () => {
  const euiThemeContext = useEuiTheme();
  return (
    <Global
      styles={[
        getBaseTypeIconsStyles(euiThemeContext),
        getMonacoWorkflowOverridesStyles(euiThemeContext),
        getProposedChangesStyles(),
        getInlineEditStyles(),
      ]}
    />
  );
};
