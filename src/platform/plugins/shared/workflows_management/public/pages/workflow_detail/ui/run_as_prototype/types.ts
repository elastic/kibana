/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type RunAsBindingStatus = 'none' | 'ok' | 'unauthorized' | 'missing';

export type RunAsScenarioId = 'fresh' | 'bound' | 'unauthorized' | 'deleted';

export interface ServiceAccount {
  readonly id: string;
  readonly desc: string;
  readonly roles: readonly string[];
  readonly authorized: boolean;
  readonly exists: boolean;
  readonly pendingAuth?: boolean;
}

export interface RunAsScenario {
  readonly id: RunAsScenarioId;
  readonly label: string;
  readonly sub: string;
  readonly note: string;
}

export const ALL_SERVICE_ACCOUNT_ROLES = [
  'workflow_executor',
  'workflow_logs_viewer',
  'alerts_viewer',
  'cases_editor',
  'kibana_admin',
] as const;

export const RUN_AS_SCENARIOS: readonly RunAsScenario[] = [
  {
    id: 'fresh',
    label: 'Fresh workflow',
    sub: 'no run_as yet',
    note: 'The run_as line does not exist until an account is bound. The header shows “No service account”.',
  },
  {
    id: 'bound',
    label: 'Bound',
    sub: 'svc-obs-triage',
    note: 'Header and modal point at the same saved value. Runs use the service account.',
  },
  {
    id: 'unauthorized',
    label: 'Imported, unauthorized',
    sub: 'reference copied, not authorized',
    note: 'The YAML names an account that exists, but this workflow was never authorized to use it (e.g. cloned or imported).',
  },
  {
    id: 'deleted',
    label: 'Account deleted',
    sub: 'broken reference',
    note: 'The bound account no longer exists. The workflow can’t run until someone with manage_security rebinds or clears it.',
  },
];

export const DEFAULT_ACCOUNTS: ServiceAccount[] = [
  {
    id: 'svc-obs-triage',
    desc: 'Observability alert triage',
    roles: ['alerts_viewer', 'cases_editor', 'workflow_executor'],
    authorized: true,
    exists: true,
  },
  {
    id: 'svc-logs-readonly',
    desc: 'Read-only log inspection',
    roles: ['workflow_logs_viewer'],
    authorized: true,
    exists: true,
  },
];

export const bindingStatusOf = (
  runAs: string | null,
  accounts: readonly ServiceAccount[]
): RunAsBindingStatus => {
  if (!runAs) {
    return 'none';
  }
  const account = accounts.find((a) => a.id === runAs);
  if (!account || !account.exists) {
    return 'missing';
  }
  if (!account.authorized) {
    return 'unauthorized';
  }
  return 'ok';
};

export const applyScenarioAccounts = (
  scenario: RunAsScenarioId,
  base: readonly ServiceAccount[]
): { accounts: ServiceAccount[]; draftRunAs: string | null; savedRunAs: string | null } => {
  const accounts: ServiceAccount[] = base.map((a) => ({ ...a, pendingAuth: false }));

  if (scenario === 'fresh') {
    return { accounts, draftRunAs: null, savedRunAs: null };
  }
  if (scenario === 'bound') {
    return { accounts, draftRunAs: 'svc-obs-triage', savedRunAs: 'svc-obs-triage' };
  }
  if (scenario === 'unauthorized') {
    const next: ServiceAccount[] = [...accounts];
    const existing = next.find((a) => a.id === 'svc-sec-response');
    if (existing) {
      next.splice(next.indexOf(existing), 1, {
        ...existing,
        authorized: false,
        exists: true,
        pendingAuth: false,
      });
    } else {
      next.push({
        id: 'svc-sec-response',
        desc: 'Security response automation',
        roles: ['kibana_admin'],
        authorized: false,
        exists: true,
        pendingAuth: false,
      });
    }
    return { accounts: next, draftRunAs: 'svc-sec-response', savedRunAs: 'svc-sec-response' };
  }
  // deleted
  const next: ServiceAccount[] = [...accounts];
  const existing = next.find((a) => a.id === 'svc-old-pipeline');
  if (existing) {
    next.splice(next.indexOf(existing), 1, {
      ...existing,
      exists: false,
      authorized: true,
      pendingAuth: false,
    });
  } else {
    next.push({
      id: 'svc-old-pipeline',
      desc: '',
      roles: ['workflow_executor'],
      authorized: true,
      exists: false,
      pendingAuth: false,
    });
  }
  return { accounts: next, draftRunAs: 'svc-old-pipeline', savedRunAs: 'svc-old-pipeline' };
};
