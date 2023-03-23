/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DropType } from '../types';

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

export type RegisteredDropTargets = Record<string, DropIdentifier | undefined> | undefined;

/**
 * The shape of the drag / drop context.
 */
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
   * keyboard mode
   */
  setKeyboardMode: (mode: boolean) => void;
  /**
   * Set the item being dragged.
   */
  setDragging: (dragging?: DraggingIdentifier) => void;

  activeDropTarget?: DropIdentifier;

  dropTargetsByOrder: RegisteredDropTargets;

  setActiveDropTarget: (newTarget?: DropIdentifier) => void;

  setA11yMessage: (message: string) => void;
  registerDropTarget: (order: number[], dropTarget?: DropIdentifier) => void;

  /**
   * Customizable data-test-subj prefix
   */
  dataTestSubjPrefix: string;

  /**
   * A custom callback for telemetry
   * @param event
   */
  onTrackUICounterEvent?: (event: string) => void;
}
