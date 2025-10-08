/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useMemo, useState } from 'react';
import { combineLatest, of } from 'rxjs';
import type { CoreStart } from '@kbn/core/public';
import { DEFAULT_APP_CATEGORIES, type PublicAppInfo } from '@kbn/core/public';
import type { Space, SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY } from '../../common/ui_setting_keys';
import type { AIAssistantType } from '../../common/ai_assistant_type';

function getVisibility(
  appId: string | undefined,
  applications: ReadonlyMap<string, PublicAppInfo>,
  isUntouchedUiSetting: boolean,
  activeSpace?: Space
) {
  const categoryId =
    (appId && applications.get(appId)?.category?.id) || DEFAULT_APP_CATEGORIES.kibana.id;

  const isSolutionPage = [
    DEFAULT_APP_CATEGORIES.observability.id,
    DEFAULT_APP_CATEGORIES.enterpriseSearch.id,
    DEFAULT_APP_CATEGORIES.security.id,
  ].includes(categoryId);

  const isSolutionView = Boolean(activeSpace?.solution && activeSpace.solution !== 'classic');

  return !isSolutionPage && isUntouchedUiSetting && !isSolutionView;
}

/**
 * Determines if the AI Assistant nav control selector should be visible.
 * Only visible on non-solution pages.
 *
 * @returns boolean
 */
export function useIsNavControlVisible(coreStart: CoreStart, spaces?: SpacesPluginStart) {
  const [isVisible, setIsVisible] = useState(false);

  const { currentAppId$, applications$ } = coreStart.application;

  const uiSetting$ = coreStart.uiSettings.get$<AIAssistantType>(
    PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY
  );

  const activeSpace$ = useMemo(
    () => spaces?.getActiveSpace$?.() ?? of<Space | undefined>(undefined),
    [spaces]
  );

  useEffect(() => {
    const appSubscription = combineLatest([
      currentAppId$,
      applications$,
      activeSpace$,
      uiSetting$,
    ]).subscribe({
      next: ([appId, applications, activeSpace]) => {
        const isUntouchedUiSetting = coreStart.uiSettings.isDefault(
          PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY
        );
        setIsVisible(getVisibility(appId, applications, isUntouchedUiSetting, activeSpace));
      },
    });

    return () => appSubscription.unsubscribe();
  });

  return { isVisible };
}
