/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { combineLatest, of, map } from 'rxjs';
import type { CoreStart } from '@kbn/core/public';
import { DEFAULT_APP_CATEGORIES, type PublicAppInfo } from '@kbn/core/public';
import type { Space, SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import {
  PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY,
  PREFERRED_CHAT_EXPERIENCE_SETTING_KEY,
} from '../../common/ui_setting_keys';
import { AIAssistantType } from '../../common/ai_assistant_type';

function getVisibility(
  appId: string | undefined,
  applications: ReadonlyMap<string, PublicAppInfo>,
  isUntouchedUiSetting: boolean,
  chatExperience: AIChatExperience,
  activeSpace?: Space
) {
  // If AI Agents are enabled, hide the nav control
  // AgentBuilderNavControl will be used instead
  if (chatExperience === AIChatExperience.Agent) {
    return false;
  }
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
 * Returns an Observable that emits whether the AI Assistant nav control selector should be visible.
 * Only visible on non-solution pages.
 */
export function getIsNavControlVisible$(coreStart: CoreStart, spaces?: SpacesPluginStart) {
  const { currentAppId$, applications$ } = coreStart.application;

  const uiSetting$ = coreStart.settings.client.get$<AIAssistantType>(
    PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY,
    AIAssistantType.Default
  );

  const chatExperience$ = coreStart.settings.client.get$<AIChatExperience>(
    PREFERRED_CHAT_EXPERIENCE_SETTING_KEY
  );

  const activeSpace$ = spaces?.getActiveSpace$?.() ?? of<Space | undefined>(undefined);

  return combineLatest([
    currentAppId$,
    applications$,
    activeSpace$,
    uiSetting$,
    chatExperience$,
  ]).pipe(
    map(([appId, applications, activeSpace, _uiSetting, chatExperience]) => {
      const isUntouchedUiSetting = coreStart.settings.client.isDefault(
        PREFERRED_AI_ASSISTANT_TYPE_SETTING_KEY
      );
      return getVisibility(appId, applications, isUntouchedUiSetting, chatExperience, activeSpace);
    })
  );
}
