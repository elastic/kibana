/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DropType } from '../types';
import { DragDropAction } from './providers';

export interface HumanData {
  label: string;
  groupLabel?: string;
  layerNumber?: number;
  position?: number;
  nextLabel?: string;
  canSwap?: boolean;
  canDuplicate?: boolean;
  canCombine?: boolean;
}

export interface Ghost {
  children: React.ReactElement;
  className?: string;
  style: React.CSSProperties;
}

/**
 * Drag Drop base identifier
 */
export type DragDropIdentifier = Record<string, unknown> & {
  id: string;
  /**
   * The data for accessibility, consists of required label and not required groupLabel and position in group
   */
  humanData: HumanData;
};

/**
 * Dragging identifier
 */
export type DraggingIdentifier = DragDropIdentifier & {
  ghost?: Ghost;
};

/**
 * Drop identifier
 */
export type DropIdentifier = DragDropIdentifier & {
  dropType: DropType;
  onDrop: DropHandler;
};

/**
 * A function that handles a drop event.
 */
export type DropHandler = (dropped: DragDropIdentifier, dropType?: DropType) => void;

export type RegisteredDropTargets = Record<string, DropIdentifier> | undefined;

export interface DragContextState {
  /**
   * The item being dragged or undefined.
   */
  dragging?: DraggingIdentifier;
  /**
   * keyboard mode
   */
  keyboardMode: boolean;
  /**
   * currently selected drop target
   */
  hoveredDropTarget?: DropIdentifier;
  /**
   * currently registered drop targets
   */
  dropTargetsByOrder: RegisteredDropTargets;

  /**
   * Customizable data-test-subj prefix
   */
  dataTestSubjPrefix: string;
}

export type CustomMiddleware = (action: DragDropAction) => void;

export type DragContextValue = [
  state: DragContextState,
  dispatch: React.Dispatch<DragDropAction>,
  customMiddleware?: CustomMiddleware
];
