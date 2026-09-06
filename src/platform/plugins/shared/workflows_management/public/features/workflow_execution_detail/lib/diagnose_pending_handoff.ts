/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DiagnosisContextPackage } from './build_diagnosis_context_package';

export const DIAGNOSE_PENDING_HANDOFF_STORAGE_KEY =
  'workflows.executionFlyout.diagnose.pendingHandoff';

export interface PendingDiagnoseHandoff {
  contextPackage: DiagnosisContextPackage;
  workflowName: string;
}

export const savePendingDiagnoseHandoff = (pending: PendingDiagnoseHandoff): void => {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  try {
    sessionStorage.setItem(DIAGNOSE_PENDING_HANDOFF_STORAGE_KEY, JSON.stringify(pending));
  } catch {
    // best-effort
  }
};

export const loadPendingDiagnoseHandoff = (): PendingDiagnoseHandoff | null => {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }
  try {
    const raw = sessionStorage.getItem(DIAGNOSE_PENDING_HANDOFF_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as PendingDiagnoseHandoff;
  } catch {
    return null;
  }
};

export const clearPendingDiagnoseHandoff = (): void => {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  try {
    sessionStorage.removeItem(DIAGNOSE_PENDING_HANDOFF_STORAGE_KEY);
  } catch {
    // best-effort
  }
};
