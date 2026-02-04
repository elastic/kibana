/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useMemo, useState } from 'react';

import type { DashboardCreationOptions } from '../..';
import { createDashboardEditUrl } from '../../utils/urls';
import { screenshotModeService, spacesService } from '../../services/kibana_services';
import { useDashboardMountContext } from './dashboard_mount_context';
import type { DashboardReadResponseBody } from '../../../server';

export const useDashboardOutcomeValidation = () => {
  const [aliasId, setAliasId] = useState<string>();
  const [outcome, setOutcome] = useState<string>();
  const [savedObjectId, setSavedObjectId] = useState<string>();

  const { scopedHistory: getScopedHistory } = useDashboardMountContext();
  const scopedHistory = getScopedHistory?.();

  const validateOutcome: DashboardCreationOptions['validateLoadedSavedObject'] = useCallback(
    (result: DashboardReadResponseBody) => {
      if (result.meta.outcome === 'aliasMatch' && result.meta.alias_target_id) {
        const path = scopedHistory.location.hash.replace(result.id, result.meta.alias_target_id);
        if (screenshotModeService.isScreenshotMode()) {
          scopedHistory.replace(path); // redirect without the toast when in screenshot mode.
        } else {
          spacesService?.ui.redirectLegacyUrl({ path, aliasPurpose: result.meta.alias_purpose });
        }
        return 'redirected'; // redirected. Stop loading dashboard.
      }
      setAliasId(result.meta.alias_target_id);
      setOutcome(result.meta.outcome);
      setSavedObjectId(result.id);
      return 'valid';
    },
    [scopedHistory]
  );

  const getLegacyConflictWarning = useMemo(() => {
    if (savedObjectId && outcome === 'conflict' && aliasId) {
      return () =>
        spacesService?.ui.components.getLegacyUrlConflict({
          currentObjectId: savedObjectId,
          otherObjectId: aliasId,
          otherObjectPath: `#${createDashboardEditUrl(aliasId)}${scopedHistory.location.search}`,
        });
    }
    return null;
  }, [aliasId, outcome, savedObjectId, scopedHistory]);

  return { validateOutcome, getLegacyConflictWarning };
};
