/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createToken } from '@kbn/core-di';

/**
 * A factory registration entry for the embeddable framework's DI-based discovery.
 *
 * Plugins bind this token globally to register embeddable factories without
 * calling `registerReactEmbeddableFactory` imperatively.  The embeddable
 * plugin collects all globally-published entries in an `OnStart` hook and
 * populates the internal registry.
 */
export interface EmbeddableFactoryRegistrationEntry {
  /** Unique embeddable type key (e.g., `'lens'`, `'search'`). */
  readonly type: string;
  /** Async getter returning the factory definition.  Should lazy-import the actual factory. */
  readonly getFactory: () => Promise<unknown>;
}

/**
 * DI token for registering embeddable factories via {@link Global} multi-binding.
 *
 * @example
 * ```ts
 * publish(EmbeddableFactoryRegistration).toConstantValue({ type: MY_TYPE, getFactory });
 * ```
 */
export const EmbeddableFactoryRegistration = createToken<EmbeddableFactoryRegistrationEntry>(
  'embeddable.FactoryRegistration'
);
