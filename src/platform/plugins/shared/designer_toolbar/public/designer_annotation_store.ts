/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

let canvasVisible = false;
const subscribers = new Set<(visible: boolean) => void>();

export const designerAnnotationStore = {
  getCanvasVisible: () => canvasVisible,
  setCanvasVisible: (value: boolean) => {
    canvasVisible = value;
    subscribers.forEach((fn) => fn(canvasVisible));
  },
  subscribe: (fn: (visible: boolean) => void) => {
    subscribers.add(fn);
    return () => {
      subscribers.delete(fn);
    };
  },
};
