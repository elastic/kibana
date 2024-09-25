/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useMemo, useState } from 'react';

import { pluginServices } from '../../services/plugin_services';
import { createDashboardEditUrl } from '../../dashboard_constants';
import { useDashboardMountContext } from './dashboard_mount_context';
import { LoadDashboardReturn } from '../../services/dashboard_content_management/types';
import { DashboardCreationOptions } from '../..';

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

  const validateOutcome: DashboardCreationOptions['validateLoadedSavedObject'] = useCallback(
    ({ dashboardFound, resolveMeta, dashboardId }: LoadDashboardReturn) => {
      if (!dashboardFound) {
        return 'invalid';
      }

      if (resolveMeta && dashboardId) {
        const { outcome: loadOutcome, aliasTargetId: alias, aliasPurpose } = resolveMeta;
        /**
         * Handle saved object resolve alias outcome by redirecting.
         */
        if (loadOutcome === 'aliasMatch' && dashboardId && alias) {
          const path = scopedHistory.location.hash.replace(dashboardId, alias);
          if (screenshotMode.isScreenshotMode()) {
            scopedHistory.replace(path); // redirect without the toast when in screenshot mode.
          } else {
            spaces.redirectLegacyUrl?.({ path, aliasPurpose });
          }
          return 'redirected'; // redirected. Stop loading dashboard.
        }
        setAliasId(alias);
        setOutcome(loadOutcome);
        setSavedObjectId(dashboardId);
      }
      return 'valid';
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
