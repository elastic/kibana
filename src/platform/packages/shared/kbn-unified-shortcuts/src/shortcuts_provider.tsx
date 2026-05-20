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
import { CommandPalette } from './command_palette';
import type { LeaderKeyShortcutGroup } from './types';
import { LeaderShortcutPicker } from './leader_shortcut_picker';
import { normalizeShortcutKey } from './shortcut_utils';

interface LeaderKeyGroupRegistration extends LeaderKeyShortcutGroup {
  openShortcuts: () => void;
}

type LeaderKeyGroupRegistry = Record<
  string,
  LeaderKeyGroupRegistration & {
    registrationToken: symbol;
  }
>;

interface ShortcutsContextValue {
  tryAcquireShortcutsLock: (instanceId: symbol) => boolean;
  releaseShortcutsLock: (instanceId: symbol) => void;
  registerLeaderKeyGroup: (registration: LeaderKeyGroupRegistration) => () => void;
  registeredLeaderKeyGroups: LeaderKeyGroupRegistration[];
}

type ShortcutsContextActions = Omit<ShortcutsContextValue, 'registeredLeaderKeyGroups'>;

/**
 * Props for {@link ShortcutsProvider}.
 */
export type ShortcutsProviderProps = PropsWithChildren;

const ShortcutsContext = createContext<ShortcutsContextValue | undefined>(undefined);

/**
 * Provides shared keyboard shortcut coordination state to shortcut primitives.
 */
export const ShortcutsProvider = ({ children }: ShortcutsProviderProps) => {
  const shortcutsLockRef = useRef<symbol>();
  const [leaderKeyGroups, setLeaderKeyGroups] = useState<LeaderKeyGroupRegistry>({});
  const actions = useMemo<ShortcutsContextActions>(() => {
    return {
      tryAcquireShortcutsLock: (instanceId) => {
        const lockAcquired =
          shortcutsLockRef.current === undefined || shortcutsLockRef.current === instanceId;

        if (lockAcquired) {
          shortcutsLockRef.current = instanceId;
        }

        return lockAcquired;
      },
      releaseShortcutsLock: (instanceId) => {
        if (shortcutsLockRef.current === instanceId) {
          shortcutsLockRef.current = undefined;
        }
      },
      registerLeaderKeyGroup: (registration) => {
        const normalizedLeaderKey = normalizeShortcutKey(registration.leaderKey);
        const registrationToken = Symbol(`leader-key-group:${normalizedLeaderKey}`);

        setLeaderKeyGroups((currentLeaderKeyGroups) => ({
          ...currentLeaderKeyGroups,
          [normalizedLeaderKey]: {
            ...registration,
            leaderKey: normalizedLeaderKey,
            registrationToken,
          },
        }));

        return () => {
          setLeaderKeyGroups((currentLeaderKeyGroups) => {
            const currentRegistration = currentLeaderKeyGroups[normalizedLeaderKey];

            if (currentRegistration?.registrationToken !== registrationToken) {
              return currentLeaderKeyGroups;
            }

            const { [normalizedLeaderKey]: removedRegistration, ...nextLeaderKeyGroups } =
              currentLeaderKeyGroups;

            return nextLeaderKeyGroups;
          });
        };
      },
    };
  }, []);
  const value = useMemo<ShortcutsContextValue>(
    () => ({
      ...actions,
      registeredLeaderKeyGroups: Object.values(leaderKeyGroups).map(
        ({ registrationToken, ...registeredLeaderKeyGroup }) => registeredLeaderKeyGroup
      ),
    }),
    [actions, leaderKeyGroups]
  );

  return (
    <ShortcutsContext.Provider value={value}>
      {children}
      <LeaderShortcutPicker />
      <CommandPalette />
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
