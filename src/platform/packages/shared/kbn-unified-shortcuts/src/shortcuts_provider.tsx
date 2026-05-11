/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, {
  type PropsWithChildren,
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { LeaderShortcutPicker } from './leader_shortcut_picker';
import { normalizeShortcutKey } from './shortcut_utils';

interface LeaderKeyShortcutRegistration {
  leaderKey: string;
  leaderKeyDescription: string;
  openShortcuts: () => void;
}

type LeaderKeyShortcutsRegistry = Record<
  string,
  LeaderKeyShortcutRegistration & {
    registrationToken: symbol;
  }
>;

interface ShortcutsContextValue {
  claimActiveLeaderKeyInstance: (instanceId: symbol) => void;
  releaseActiveLeaderKeyInstance: (instanceId: symbol) => void;
  hasOtherActiveLeaderKeyInstance: (instanceId: symbol) => boolean;
  registerLeaderKeyShortcut: (registration: LeaderKeyShortcutRegistration) => () => void;
  registeredLeaderKeyShortcuts: LeaderKeyShortcutRegistration[];
}

type ShortcutsContextActions = Omit<ShortcutsContextValue, 'registeredLeaderKeyShortcuts'>;

/**
 * Props for {@link ShortcutsProvider}.
 */
export type ShortcutsProviderProps = PropsWithChildren;

const ShortcutsContext = createContext<ShortcutsContextValue | undefined>(undefined);

/**
 * Provides shared keyboard shortcut coordination state to shortcut primitives.
 */
export const ShortcutsProvider = ({ children }: ShortcutsProviderProps) => {
  const activeLeaderKeyInstanceRef = useRef<symbol | undefined>();
  const [leaderKeyShortcuts, setLeaderKeyShortcuts] = useState<LeaderKeyShortcutsRegistry>({});
  const actions = useMemo<ShortcutsContextActions>(() => {
    return {
      claimActiveLeaderKeyInstance: (instanceId) => {
        activeLeaderKeyInstanceRef.current = instanceId;
      },
      releaseActiveLeaderKeyInstance: (instanceId) => {
        if (activeLeaderKeyInstanceRef.current === instanceId) {
          activeLeaderKeyInstanceRef.current = undefined;
        }
      },
      hasOtherActiveLeaderKeyInstance: (instanceId) => {
        return (
          activeLeaderKeyInstanceRef.current !== undefined &&
          activeLeaderKeyInstanceRef.current !== instanceId
        );
      },
      registerLeaderKeyShortcut: (registration) => {
        const normalizedLeaderKey = normalizeShortcutKey(registration.leaderKey);
        const registrationToken = Symbol(`leader-key-shortcut:${normalizedLeaderKey}`);

        setLeaderKeyShortcuts((currentLeaderKeyShortcuts) => {
          return {
            ...currentLeaderKeyShortcuts,
            [normalizedLeaderKey]: {
              ...registration,
              leaderKey: normalizedLeaderKey,
              registrationToken,
            },
          };
        });

        return () => {
          setLeaderKeyShortcuts((currentLeaderKeyShortcuts) => {
            const currentRegistration = currentLeaderKeyShortcuts[normalizedLeaderKey];

            if (currentRegistration?.registrationToken !== registrationToken) {
              return currentLeaderKeyShortcuts;
            }

            const { [normalizedLeaderKey]: removedRegistration, ...nextLeaderKeyShortcuts } =
              currentLeaderKeyShortcuts;

            return nextLeaderKeyShortcuts;
          });
        };
      },
    };
  }, []);
  const value = useMemo<ShortcutsContextValue>(
    () => ({
      ...actions,
      registeredLeaderKeyShortcuts: Object.values(leaderKeyShortcuts).map(
        ({ registrationToken, ...registeredLeaderKeyShortcut }) => registeredLeaderKeyShortcut
      ),
    }),
    [actions, leaderKeyShortcuts]
  );

  return (
    <ShortcutsContext.Provider value={value}>
      {children}
      <LeaderShortcutPicker />
    </ShortcutsContext.Provider>
  );
};

export const useShortcutsContext = () => {
  const shortcutsContext = useContext(ShortcutsContext);

  if (shortcutsContext === undefined) {
    throw new Error('useShortcutsContext must be used within a ShortcutsProvider');
  }

  return shortcutsContext;
};
