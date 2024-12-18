/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export enum ResizableLayoutMode {
  /**
   * Single panel mode -- hides the fixed panel
   */
  Single = 'single',
  /**
   * Static mode -- prevents resizing
   */
  Static = 'static',
  /**
   * Resizable mode -- allows resizing
   */
  Resizable = 'resizable',
}

export enum ResizableLayoutDirection {
  /**
   * Horizontal layout -- panels are side by side
   */
  Horizontal = 'horizontal',
  /**
   * Vertical layout -- panels are stacked
   */
  Vertical = 'vertical',
}
