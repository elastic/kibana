/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart } from '@kbn/core/public';
import { dynamic } from '@kbn/shared-ux-utility';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { useIsNavControlVisible } from '../../hooks/use_is_nav_control_visible';
import type { AIAssistantType } from '../../../common/ai_assistant_type';

const LazyNavControl = dynamic(() =>
  import('.').then((m) => ({ default: m.AIAssistantHeaderButton }))
);

export const NavControlInitiator = ({
  coreStart,
  isSecurityAIAssistantEnabled,
  isObservabilityAIAssistantEnabled,
  triggerOpenChat,
  spaces,
}: {
  coreStart: CoreStart;
  isSecurityAIAssistantEnabled: boolean;
  isObservabilityAIAssistantEnabled: boolean;
  triggerOpenChat: (event: { assistant: AIAssistantType }) => void;
  spaces?: SpacesPluginStart;
}) => {
  const { isVisible } = useIsNavControlVisible(coreStart, spaces);

  if (!isVisible) {
    return null;
  }

  return (
    <I18nProvider>
      <LazyNavControl
        isSecurityAIAssistantEnabled={isSecurityAIAssistantEnabled}
        isObservabilityAIAssistantEnabled={isObservabilityAIAssistantEnabled}
        coreStart={coreStart}
        triggerOpenChat={triggerOpenChat}
      />
    </I18nProvider>
  );
};
