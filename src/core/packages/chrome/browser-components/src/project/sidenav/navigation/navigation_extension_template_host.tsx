/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Suspense, useEffect, useState } from 'react';
import type { Observable } from 'rxjs';

import type { SerializableRecord } from '@kbn/utility-types';
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
  /** Data source powering this slot, resolved by the framework from the active solution. */
  data$: Observable<SerializableRecord>;
  /** Rendering context (surface, active item, slot/extension ids). */
  context: NavExtensionPointContext;
  /** Forwarded to the registering plugin for non-link actions. */
  onAction: (actionId: string, itemId: string) => void;
}

const useLatest = <T,>(source$: Observable<T>): T | undefined => {
  const [value, setValue] = useState<T | undefined>(undefined);

  useEffect(() => {
    const subscription = source$.subscribe(setValue);
    return () => subscription.unsubscribe();
  }, [source$]);

  return value;
};

/**
 * Subscribes to a slot's `data$` and renders the template named by the extension
 * definition.
 */
export const NavExtensionTemplateHost = ({
  definition,
  data$,
  context,
  onAction,
}: NavExtensionTemplateHostProps) => {
  const data = useLatest(data$);
  const LazyExtensionTemplate = TEMPLATES[definition.templateId as NavTemplateId];

  if (!LazyExtensionTemplate) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <LazyExtensionTemplate
        data={data}
        config={definition.config}
        context={context}
        onAction={onAction}
      />
    </Suspense>
  );
};
