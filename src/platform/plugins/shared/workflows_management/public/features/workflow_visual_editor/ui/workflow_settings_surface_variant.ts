/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Settings-surface variants. B (canvas info nodes) is the default. */
export type WorkflowSettingsSurfaceVariant = 'a' | 'b' | 'c' | 'd';

/** Option B canvas card arrangements. */
export type WorkflowSettingsBNodeLayout = 'row' | 'vertical' | 'compact';

const VARIANT_STORAGE_KEY = 'workflows.settingsSurfaceVariant';
const B_LAYOUT_STORAGE_KEY = 'workflows.settingsSurfaceBNodeLayout';

let sessionVariant: WorkflowSettingsSurfaceVariant | undefined;
let sessionBLayout: WorkflowSettingsBNodeLayout | undefined;
const listeners = new Set<() => void>();

const notify = (): void => {
  listeners.forEach((listener) => listener());
};

export const getWorkflowSettingsSurfaceVariant = (): WorkflowSettingsSurfaceVariant => {
  if (sessionVariant) return sessionVariant;
  // Option B is the settings surface. Ignore a leftover prototype choice.
  sessionVariant = 'b';
  try {
    sessionStorage.setItem(VARIANT_STORAGE_KEY, 'b');
  } catch {
    // sessionStorage unavailable
  }
  return 'b';
};

export const setWorkflowSettingsSurfaceVariant = (next: WorkflowSettingsSurfaceVariant): void => {
  sessionVariant = next;
  try {
    sessionStorage.setItem(VARIANT_STORAGE_KEY, next);
  } catch {
    // sessionStorage unavailable
  }
  notify();
};

export const getWorkflowSettingsBNodeLayout = (): WorkflowSettingsBNodeLayout => {
  if (sessionBLayout) return sessionBLayout;
  try {
    const stored = sessionStorage.getItem(B_LAYOUT_STORAGE_KEY);
    if (stored === 'row' || stored === 'vertical' || stored === 'compact') {
      sessionBLayout = stored;
      return stored;
    }
  } catch {
    // sessionStorage unavailable
  }
  sessionBLayout = 'row';
  return 'row';
};

export const setWorkflowSettingsBNodeLayout = (next: WorkflowSettingsBNodeLayout): void => {
  sessionBLayout = next;
  try {
    sessionStorage.setItem(B_LAYOUT_STORAGE_KEY, next);
  } catch {
    // sessionStorage unavailable
  }
  // Selecting a B layout implies Option B.
  if (sessionVariant !== 'b') {
    sessionVariant = 'b';
    try {
      sessionStorage.setItem(VARIANT_STORAGE_KEY, 'b');
    } catch {
      // sessionStorage unavailable
    }
  }
  notify();
};

export const subscribeWorkflowSettingsSurfaceVariant = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** @internal clears session variant between Jest cases. */
export const resetWorkflowSettingsSurfaceVariantForTests = (): void => {
  sessionVariant = undefined;
  sessionBLayout = undefined;
  listeners.clear();
  try {
    sessionStorage.removeItem(VARIANT_STORAGE_KEY);
    sessionStorage.removeItem(B_LAYOUT_STORAGE_KEY);
  } catch {
    // ignore
  }
};
