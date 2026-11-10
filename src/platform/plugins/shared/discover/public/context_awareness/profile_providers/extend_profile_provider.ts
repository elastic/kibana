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
 * Concatenates base and extension telemetry labels, keeping the first occurrence of each label.
 * @param baseLabels Labels from the base profile provider
 * @param extensionLabels Labels from the extension
 * @returns Base labels followed by new extension labels
 */
const mergeTelemetryLabels = (baseLabels: string[] = [], extensionLabels: string[] = []) =>
  [...baseLabels, ...extensionLabels].filter(
    (label, index, labels) => labels.indexOf(label) === index
  );

/**
 * Extends a base profile provider with additional properties and profile methods
 * @param baseProvider The base profile provider
 * @param extension The extension to apply to the base profile provider
 * @returns The extended profile provider
 */
export const extendProfileProvider = <TProvider extends BaseProfileProvider<{}, {}>>(
  baseProvider: TProvider,
  extension: Partial<TProvider> & Pick<TProvider, 'profileId'>
): TProvider => {
  const telemetryLabels = mergeTelemetryLabels(
    baseProvider.telemetryLabels,
    extension.telemetryLabels
  );

  return {
    ...baseProvider,
    ...extension,
    ...(telemetryLabels.length ? { telemetryLabels } : {}),
    profile: {
      ...baseProvider.profile,
      ...extension.profile,
    },
  };
};
