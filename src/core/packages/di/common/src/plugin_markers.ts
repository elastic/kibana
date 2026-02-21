/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ServiceIdentifier } from 'inversify';

/**
 * Well-known marker for hosted extension points.
 *
 * The `Symbol.for('HostedExtensionPoint')` key is a deliberate cross-package
 * protocol, not an implementation detail. Other packages (e.g. `@kbn/plugin-di`)
 * resolve the same well-known symbol rather than importing this binding, so they
 * participate in the protocol without a hard dependency on `@kbn/core-di`
 * internals. The string key is the contract; keep it stable.
 */
export const HostedExtensionPoint = Symbol.for(
  'HostedExtensionPoint'
) as ServiceIdentifier<ServiceIdentifier>;
