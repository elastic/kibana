/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { distinctUntilChanged, from, map } from 'rxjs';
import { useEffect, useState } from 'react';
import type { AppMountParameters } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import {
  internalStateActions,
  selectAllTabs,
  selectHasUnsavedChanges,
  type InternalStateStore,
  type RuntimeStateManager,
} from '../redux';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';

export const useUnsavedChanges = ({
  internalState,
  runtimeStateManager,
  onAppLeave,
}: {
  internalState: InternalStateStore;
  runtimeStateManager: RuntimeStateManager;
  onAppLeave?: AppMountParameters['onAppLeave'];
}) => {
  const services = useDiscoverServices();
  const [onChange$] = useState(() =>
    from(internalState).pipe(
      map((state) => [selectAllTabs(state), state.persistedDiscoverSession] as const),
      distinctUntilChanged(([prevTabs, prevSession], [currTabs, currSession]) => {
        return prevTabs === currTabs && prevSession === currSession;
      })
    )
  );

  useEffect(() => {
    const subscription = onChange$.subscribe(() => {
      internalState.dispatch(
        internalStateActions.setUnsavedChanges(
          selectHasUnsavedChanges(internalState.getState(), { runtimeStateManager, services })
        )
      );
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [internalState, onChange$, runtimeStateManager, services]);

  useEffect(() => {
    onAppLeave?.((actions) => {
      const { hasUnsavedChanges } = internalState.getState();

      if (!hasUnsavedChanges) return actions.default();

      return actions.confirm(
        i18n.translate('discover.confirmModal.confirmTextDescription', {
          defaultMessage:
            "You'll lose unsaved changes if you open another Discover session before returning to this one.",
        }),
        i18n.translate('discover.confirmModal.title', {
          defaultMessage: 'Unsaved changes',
        }),
        () => {},
        i18n.translate('discover.confirmModal.confirmText', {
          defaultMessage: 'Leave without saving',
        }),
        'danger'
      );
    });
  }, [internalState, onAppLeave]);
};
