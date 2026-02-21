/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createTokenFactory } from '@kbn/plugin-di';

const embeddableTokens = createTokenFactory('embeddable');

/**
 * A factory registration entry for the embeddable framework's DI-based discovery.
 *
 * Plugins contribute to this extension point to register embeddable factories without
 * calling `registerReactEmbeddableFactory` imperatively.  The embeddable
 * plugin hosts the extension point and collects all contributions in an `OnStart`
 * hook to populate the internal registry.
 */
export interface EmbeddableFactoryRegistrationEntry {
  /** Unique embeddable type key (e.g., `'lens'`, `'search'`). */
  readonly type: string;
  /** Async getter returning the factory definition.  Should lazy-import the actual factory. */
  readonly getFactory: () => Promise<unknown>;
}

/**
 * Extension point for registering embeddable factories.
 *
 * @example
 * ```ts
 * contribute(EmbeddableFactoryRegistration).toConstantValue({ type: MY_TYPE, getFactory });
 * ```
 */
export const EmbeddableFactoryRegistration =
  embeddableTokens.extensionPoint<EmbeddableFactoryRegistrationEntry>('FactoryRegistration');
