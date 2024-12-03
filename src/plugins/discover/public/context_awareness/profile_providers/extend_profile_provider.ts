/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BaseProfileProvider } from '../profile_service';

/**
 * Extends a base profile provider with additional properties and profile methods
 * @param baseProvider The base profile provider
 * @param extension The extension to apply to the base profile provider
 * @returns The extended profile provider
 */
export const extendProfileProvider = <TProvider extends BaseProfileProvider<{}, {}>>(
  baseProvider: TProvider,
  extension: Partial<TProvider> & Pick<TProvider, 'profileId'>
): TProvider => ({
  ...baseProvider,
  ...extension,
  profile: {
    ...baseProvider.profile,
    ...extension.profile,
  },
});
