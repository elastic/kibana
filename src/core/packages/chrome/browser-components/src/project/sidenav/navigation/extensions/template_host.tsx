/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Suspense, useCallback, useMemo } from 'react';
import { type Observable } from 'rxjs';
import { useObservable } from '@kbn/use-observable';
import { useChromeService } from '@kbn/core-chrome-browser-context';
import type { NavExtensionRenderContext } from '@kbn/ui-side-navigation';
import type { NavExtensionSlotData } from '@kbn/core-chrome-browser';
import type { NavExtensionRuntimeDefinition } from '@kbn/core-chrome-browser';
import {
  TEMPLATES,
  type NavExtensionPointContext,
  type NavTemplateId,
} from '@kbn/shared-ux-navigation-extension-templates';

export type { NavExtensionPointContext, NavExtensionRuntimeDefinition };

export interface NavExtensionTemplateHostProps {
  /** Resolved extension definition (template id + declarative config). */
  definition: NavExtensionRuntimeDefinition;
  /** Data source powering this extension, resolved by the framework from the registry. */
  data$: Observable<NavExtensionSlotData>;
  /** Rendering context (surface, active item, slot/extension ids). */
  context: NavExtensionPointContext;
}

/**
 * Subscribes to an extension's `data$` and renders the template named by the extension
 * definition.
 */
const NavExtensionTemplateHost = ({
  definition,
  data$,
  context,
}: NavExtensionTemplateHostProps) => {
  const data = useObservable(data$);
  const LazyExtensionTemplate = TEMPLATES[definition.templateId as NavTemplateId];

  if (!LazyExtensionTemplate || data === undefined) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <LazyExtensionTemplate data={data} config={definition.config} context={context} />
    </Suspense>
  );
};

/**
 * Helper hook used to render a navigation extension point.
 */
export const useRenderNavExtensionPoint = () => {
  const chrome = useChromeService();
  const extensionRegistry$ = useMemo(() => chrome.project.getExtensionRegistry$(), [chrome]);
  const extensionRegistry = useObservable(extensionRegistry$, undefined);

  const renderExtensionPoint = useCallback(
    (slotId: string, extensionId: string, context: NavExtensionRenderContext) => {
      const definition = extensionRegistry?.[extensionId];
      const data$ = chrome.project.getExtensionData$(extensionId);

      if (!definition || !data$) {
        return null;
      }

      return (
        <NavExtensionTemplateHost
          definition={definition}
          data$={data$}
          context={{ ...context, slotId, extensionId }}
        />
      );
    },
    [chrome, extensionRegistry]
  );

  return renderExtensionPoint;
};
