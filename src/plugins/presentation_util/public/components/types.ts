/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { MutableRefObject } from 'react';
import type { monaco } from '@kbn/monaco';
import type { CSSProperties, HTMLAttributes } from 'react';

import type { ExpressionFunction } from '@kbn/expressions-plugin/common';

import { OnSaveProps, SaveModalState } from '@kbn/saved-objects-plugin/public';

interface SaveModalDocumentInfo {
  id?: string;
  title: string;
  description?: string;
}

export interface SaveModalDashboardProps {
  documentInfo: SaveModalDocumentInfo;
  canSaveByReference: boolean;
  objectType: string;
  onClose: () => void;
  onSave: (props: OnSaveProps & { dashboardId: string | null; addToLibrary: boolean }) => void;
  tagOptions?: React.ReactNode | ((state: SaveModalState) => React.ReactNode);
}

/**
 * A type for any React Ref that can be used to store a reference to the Monaco editor within the
 * ExpressionInput.
 */
export type ExpressionInputEditorRef = MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>;

/**
 * React Props for the ExpressionInput component.
 */
export interface ExpressionInputProps
  extends Pick<HTMLAttributes<HTMLDivElement>, 'style' | 'className'> {
  /** A collection of ExpressionFunctions to use in the autocomplete */
  expressionFunctions: ExpressionFunction[];

  /** Value of expression */
  expression: string;

  /** Function invoked when expression value is changed */
  onChange: (value?: string) => void;

  /** In full screen mode or not */
  isCompact?: boolean;

  /**
   * The CodeEditor requires a set height, either on itself, or set to 100% with the parent
   * container controlling the height.  This prop is required so consumers understand this
   * limitation and are intentional in using the component.
   */
  height: CSSProperties['height'];

  /**
   * An optional ref in order to access the Monaco editor instance from consuming components,
   * (e.g. to determine if the editor is focused, etc).
   */
  editorRef?: ExpressionInputEditorRef;
}
