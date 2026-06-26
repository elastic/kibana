/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ServiceIdentifier } from 'inversify';

declare const serviceTokenBrand: unique symbol;
declare const extensionPointTokenBrand: unique symbol;

/**
 * A cross-plugin service token. Services have a single owning provider and are
 * resolved as a single value.
 * @public
 */
export type ServiceToken<T> = ServiceIdentifier<T> & {
  readonly [serviceTokenBrand]: 'service';
};

/**
 * A cross-plugin extension point token. Extension points have a single owning
 * host and are resolved as a collection of contributions.
 * @public
 */
export type ExtensionPointToken<T> = ServiceIdentifier<T> & {
  readonly [extensionPointTokenBrand]: 'extensionPoint';
};
