/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import type { Observable } from 'rxjs';

import type { NavExtensionRuntimeDefinition, NavExtensionPointContext } from './types';
import { TEMPLATES } from './templates';

export interface NavExtensionTemplateHostProps {
  /** Resolved extension definition (template id + declarative config). */
  definition: NavExtensionRuntimeDefinition;
  /** Data source powering this slot, resolved by the framework from the active solution. */
  data$: Observable<Record<string, string>>;
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
 * definition. The framework owns this boundary; extensions never render free-form JSX.
 */
export const NavExtensionTemplateHost = ({
  definition,
  data$,
  context,
  onAction,
}: NavExtensionTemplateHostProps) => {
  const data = useLatest(data$);
  const Template = TEMPLATES[definition.templateId];

  if (!Template) {
    return null;
  }

  return <Template data={data} config={definition.config} context={context} onAction={onAction} />;
};
