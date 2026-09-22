/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  applyScenarioAccounts,
  bindingStatusOf,
  DEFAULT_ACCOUNTS,
  type RunAsBindingStatus,
  type RunAsScenarioId,
  type ServiceAccount,
} from './types';

export interface RunAsPrototypeContextValue {
  readonly canBind: boolean;
  readonly setCanBind: (next: boolean) => void;
  readonly scenario: RunAsScenarioId;
  readonly applyScenario: (id: RunAsScenarioId) => void;
  readonly accounts: readonly ServiceAccount[];
  readonly draftRunAs: string | null;
  readonly savedRunAs: string | null;
  readonly setDraftRunAs: (id: string | null) => void;
  readonly simulateSave: () => { ok: boolean; partial: boolean };
  readonly isBindingDirty: boolean;
  readonly bindingStatus: RunAsBindingStatus;
  readonly partialSaveNotice: boolean;
  readonly dismissPartialSaveNotice: () => void;
  readonly isIdentityModalOpen: boolean;
  readonly openIdentityModal: () => void;
  readonly closeIdentityModal: () => void;
  /** When set, the identity modal opens with this selection instead of draftRunAs. */
  readonly identityModalPrefill: string | null | undefined;
  readonly isCreateFlyoutOpen: boolean;
  readonly openCreateFlyout: () => void;
  readonly closeCreateFlyout: () => void;
  readonly createAccount: (account: Omit<ServiceAccount, 'authorized' | 'exists'>) => void;
}

const RunAsPrototypeContext = createContext<RunAsPrototypeContextValue | null>(null);

export const RunAsPrototypeProvider = ({ children }: { children: React.ReactNode }) => {
  const initial = applyScenarioAccounts('fresh', DEFAULT_ACCOUNTS);
  const [canBind, setCanBind] = useState(true);
  const [scenario, setScenario] = useState<RunAsScenarioId>('fresh');
  const [accounts, setAccounts] = useState<ServiceAccount[]>(initial.accounts);
  const [draftRunAs, setDraftRunAs] = useState<string | null>(initial.draftRunAs);
  const [savedRunAs, setSavedRunAs] = useState<string | null>(initial.savedRunAs);
  const [partialSaveNotice, setPartialSaveNotice] = useState(false);
  const [isIdentityModalOpen, setIdentityModalOpen] = useState(false);
  const [identityModalPrefill, setIdentityModalPrefill] = useState<string | null | undefined>(
    undefined
  );
  const [isCreateFlyoutOpen, setCreateFlyoutOpen] = useState(false);

  const applyScenario = useCallback((id: RunAsScenarioId) => {
    const next = applyScenarioAccounts(id, DEFAULT_ACCOUNTS);
    setScenario(id);
    setAccounts(next.accounts);
    setDraftRunAs(next.draftRunAs);
    setSavedRunAs(next.savedRunAs);
    setPartialSaveNotice(false);
  }, []);

  const simulateSave = useCallback(() => {
    if (draftRunAs === savedRunAs) {
      return { ok: true, partial: false };
    }
    if (!canBind) {
      setDraftRunAs(savedRunAs);
      setPartialSaveNotice(true);
      return { ok: false, partial: true };
    }
    setAccounts((prev) =>
      prev.map((a) =>
        a.id === draftRunAs && a.pendingAuth
          ? { ...a, authorized: true, pendingAuth: false }
          : a
      )
    );
    setSavedRunAs(draftRunAs);
    setPartialSaveNotice(false);
    return { ok: true, partial: false };
  }, [canBind, draftRunAs, savedRunAs]);

  const createAccount = useCallback(
    (account: Omit<ServiceAccount, 'authorized' | 'exists'>) => {
      setAccounts((prev) => [
        ...prev,
        { ...account, authorized: true, exists: true, pendingAuth: false },
      ]);
      setIdentityModalPrefill(account.id);
      setCreateFlyoutOpen(false);
      setIdentityModalOpen(true);
    },
    []
  );

  const value = useMemo<RunAsPrototypeContextValue>(
    () => ({
      canBind,
      setCanBind,
      scenario,
      applyScenario,
      accounts,
      draftRunAs,
      savedRunAs,
      setDraftRunAs: (id) => {
        setDraftRunAs(id);
        if (id) {
          setAccounts((prev) =>
            prev.map((a) =>
              a.id === id && a.exists && !a.authorized ? { ...a, pendingAuth: true } : a
            )
          );
        }
      },
      simulateSave,
      isBindingDirty: draftRunAs !== savedRunAs,
      bindingStatus: bindingStatusOf(draftRunAs, accounts),
      partialSaveNotice,
      dismissPartialSaveNotice: () => setPartialSaveNotice(false),
      isIdentityModalOpen,
      openIdentityModal: () => {
        setIdentityModalPrefill(undefined);
        setIdentityModalOpen(true);
      },
      closeIdentityModal: () => {
        setIdentityModalOpen(false);
        setIdentityModalPrefill(undefined);
      },
      identityModalPrefill,
      isCreateFlyoutOpen,
      openCreateFlyout: () => {
        setIdentityModalOpen(false);
        setCreateFlyoutOpen(true);
      },
      closeCreateFlyout: () => {
        setCreateFlyoutOpen(false);
        setIdentityModalOpen(true);
      },
      createAccount,
    }),
    [
      canBind,
      scenario,
      applyScenario,
      accounts,
      draftRunAs,
      savedRunAs,
      simulateSave,
      partialSaveNotice,
      isIdentityModalOpen,
      identityModalPrefill,
      isCreateFlyoutOpen,
      createAccount,
    ]
  );

  return (
    <RunAsPrototypeContext.Provider value={value}>{children}</RunAsPrototypeContext.Provider>
  );
};

export const useRunAsPrototype = (): RunAsPrototypeContextValue => {
  const ctx = useContext(RunAsPrototypeContext);
  if (!ctx) {
    throw new Error('useRunAsPrototype must be used within RunAsPrototypeProvider');
  }
  return ctx;
};

/** Safe hook for optional mount points that may render outside the provider in tests. */
export const useOptionalRunAsPrototype = (): RunAsPrototypeContextValue | null =>
  useContext(RunAsPrototypeContext);
