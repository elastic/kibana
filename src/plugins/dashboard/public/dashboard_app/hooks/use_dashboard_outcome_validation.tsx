/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback, useMemo, useState } from 'react';

import { pluginServices } from '../../services/plugin_services';
import { createDashboardEditUrl } from '../../dashboard_constants';
import { useDashboardMountContext } from './dashboard_mount_context';
import { LoadDashboardReturn } from '../../services/dashboard_content_management/types';

export const useDashboardOutcomeValidation = () => {
  const [aliasId, setAliasId] = useState<string>();
  const [outcome, setOutcome] = useState<string>();
  const [savedObjectId, setSavedObjectId] = useState<string>();

  const { scopedHistory: getScopedHistory } = useDashboardMountContext();
  const scopedHistory = getScopedHistory?.();

  /**
   * Unpack dashboard services
   */
  const { screenshotMode, spaces } = pluginServices.getServices();

  const validateOutcome = useCallback(
    ({ dashboardFound, resolveMeta, dashboardId }: LoadDashboardReturn) => {
      if (!dashboardFound) {
        return false; // redirected. Stop loading dashboard.
      }

      if (resolveMeta && dashboardId) {
        const { outcome: loadOutcome, aliasTargetId: alias, aliasPurpose } = resolveMeta;
        /**
         * Handle saved object resolve alias outcome by redirecting.
         */
        if (loadOutcome === 'aliasMatch' && dashboardId && alias) {
          const path = scopedHistory.location.hash.replace(dashboardId, alias);
          if (screenshotMode.isScreenshotMode()) {
            // navigate on next tick to allow Dashboard to finish entering error state.
            setTimeout(() => scopedHistory.replace(path), 1);
          } else {
            // navigate on next tick to allow Dashboard to finish entering error state.
            setTimeout(() => spaces.redirectLegacyUrl?.({ path, aliasPurpose }), 1);
            return false; // redirected. Stop loading dashboard.
          }
        }
        setAliasId(alias);
        setOutcome(loadOutcome);
        setSavedObjectId(dashboardId);
      }
      return true;
    },
    [scopedHistory, screenshotMode, spaces]
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
