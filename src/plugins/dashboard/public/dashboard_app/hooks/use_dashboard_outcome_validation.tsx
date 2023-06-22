/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback, useMemo, useState } from 'react';

import { DashboardRedirect } from '../types';
import { pluginServices } from '../../services/plugin_services';
import { createDashboardEditUrl } from '../../dashboard_constants';
import { getDashboardURL404String } from '../_dashboard_app_strings';
import { useDashboardMountContext } from './dashboard_mount_context';
import { LoadDashboardFromSavedObjectReturn } from '../../services/dashboard_saved_object/lib/load_dashboard_state_from_saved_object';

export const useDashboardOutcomeValidation = ({
  redirectTo,
}: {
  redirectTo: DashboardRedirect;
}) => {
  const [aliasId, setAliasId] = useState<string>();
  const [outcome, setOutcome] = useState<string>();
  const [savedObjectId, setSavedObjectId] = useState<string>();

  const { scopedHistory: getScopedHistory } = useDashboardMountContext();
  const scopedHistory = getScopedHistory?.();

  /**
   * Unpack dashboard services
   */
  const {
    notifications: { toasts },
    screenshotMode,
    spaces,
  } = pluginServices.getServices();

  const validateOutcome = useCallback(
    ({ dashboardFound, resolveMeta, dashboardId }: LoadDashboardFromSavedObjectReturn) => {
      if (!dashboardFound) {
        toasts.addDanger(getDashboardURL404String());
        redirectTo({ destination: 'listing' });
        return false; // redirected. Stop loading dashboard.
      }

      if (resolveMeta && dashboardId) {
        const {
          outcome: loadOutcome,
          alias_target_id: alias,
          alias_purpose: aliasPurpose,
        } = resolveMeta;
        /**
         * Handle saved object resolve alias outcome by redirecting.
         */
        if (loadOutcome === 'aliasMatch' && dashboardId && alias) {
          const path = scopedHistory.location.hash.replace(dashboardId, alias);
          if (screenshotMode.isScreenshotMode()) {
            scopedHistory.replace(path);
          } else {
            spaces.redirectLegacyUrl?.({ path, aliasPurpose });
            return false; // redirected. Stop loading dashboard.
          }
        }
        setAliasId(alias);
        setOutcome(loadOutcome);
        setSavedObjectId(dashboardId);
      }
      return true;
    },
    [scopedHistory, redirectTo, screenshotMode, spaces, toasts]
  );

  const getLegacyConflictWarning = useMemo(() => {
    if (savedObjectId && outcome === 'conflict' && aliasId) {
      return () =>
        spaces.getLegacyUrlConflict?.({
          currentObjectId: savedObjectId,
          otherObjectId: aliasId,
          otherObjectPath: `#${createDashboardEditUrl(aliasId)}${scopedHistory.location.search}`,
        });
    }
    return null;
  }, [aliasId, outcome, savedObjectId, scopedHistory, spaces]);

  return { validateOutcome, getLegacyConflictWarning };
};
