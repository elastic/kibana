/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import equal from 'fast-deep-equal';
import type { MigrationSnapshot } from '../types';

export function getUpdatedTypes({
  from,
  to,
}: {
  from: MigrationSnapshot;
  to: MigrationSnapshot;
}): string[] {
  return Object.keys(to.typeDefinitions).filter((type) => {
    if (!Object.prototype.hasOwnProperty.call(to.typeDefinitions, type)) {
      return false;
    }
    const infoBefore = from.typeDefinitions[type];
    const infoAfter = to.typeDefinitions[type]!;
    return !infoBefore || !equal(infoBefore, infoAfter);
  });
}
