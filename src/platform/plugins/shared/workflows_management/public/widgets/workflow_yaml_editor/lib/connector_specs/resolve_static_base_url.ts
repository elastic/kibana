/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext, ConnectorSpec } from '@kbn/connector-specs';
import { connectorsSpecs } from '@kbn/connector-specs';

/**
 * Heuristic: whether a `getBaseUrl` implementation references the action
 * context (config/secrets), in which case it can't be resolved at authoring
 * time (there is no runtime context on the client).
 */
const usesContext = (getBaseUrl: NonNullable<ConnectorSpec['getBaseUrl']>): boolean => {
  const source = Function.prototype.toString.call(getBaseUrl);
  return /\b(ctx|config|secrets)\b/.test(source);
};

/**
 * Attempts to resolve a connector's base URL without a runtime context. Only
 * resolves for specs whose `getBaseUrl` is context-independent (constant hosts);
 * returns `null` when resolution would depend on config/secrets, so callers
 * never surface or rely on a misleading, partially-interpolated URL.
 */
export const resolveStaticBaseUrl = (spec: ConnectorSpec): string | null => {
  const { getBaseUrl } = spec;
  // `getBaseUrl.length > 0` means it declares a parameter (i.e. uses ctx).
  if (!getBaseUrl || getBaseUrl.length > 0 || usesContext(getBaseUrl)) {
    return null;
  }
  try {
    const resolved = getBaseUrl({} as ActionContext);
    return typeof resolved === 'string' && resolved.length > 0 ? resolved : null;
  } catch {
    return null;
  }
};

/**
 * Looks up a v2 connector spec by its workflow connector-type id, accepting
 * either the dotted form (`.slack`) or the bare form (`slack`).
 */
export const getConnectorSpecByType = (connectorType: string): ConnectorSpec | undefined => {
  const dotted = connectorType.startsWith('.') ? connectorType : `.${connectorType}`;
  for (const spec of Object.values(connectorsSpecs) as ConnectorSpec[]) {
    if (spec?.metadata?.id === dotted) {
      return spec;
    }
  }
  return undefined;
};
