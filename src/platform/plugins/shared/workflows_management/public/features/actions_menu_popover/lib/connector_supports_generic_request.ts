/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorSpec } from '@kbn/connector-specs';
import { connectorsSpecs } from '@kbn/connector-specs';

/**
 * Whether a connector type (e.g. `.slack`) is a v2 connector spec that exposes
 * the framework-synthesized generic `request` action. Connectors that opt out
 * via `disableGenericRequest` (e.g. MCP connectors) do not, so the "Build one"
 * footer should not be offered for them.
 */
export const connectorSupportsGenericRequest = (connectorType: string): boolean => {
  const dotted = connectorType.startsWith('.') ? connectorType : `.${connectorType}`;
  const spec = (Object.values(connectorsSpecs) as ConnectorSpec[]).find(
    (candidate) => candidate?.metadata?.id === dotted
  );
  return Boolean(spec) && !spec!.disableGenericRequest;
};
