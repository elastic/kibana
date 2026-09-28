/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Last-focused templatable config field that can receive a click-to-insert
 * from the execution-output table (which lives in a separate flyout).
 * Cleared only when a newer target registers or the owner unmounts — not on
 * blur, so clicking an execution row after leaving the field still works.
 */
type InsertFn = (token: string) => void;

let activeTarget: InsertFn | null = null;

export const setActiveDataReferenceInsertTarget = (fn: InsertFn): void => {
  activeTarget = fn;
};

export const clearActiveDataReferenceInsertTarget = (fn: InsertFn): void => {
  if (activeTarget === fn) {
    activeTarget = null;
  }
};

export const insertIntoActiveDataReferenceTarget = (token: string): boolean => {
  if (!activeTarget) return false;
  activeTarget(token);
  return true;
};
