/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

export const applyExportTransformsMock = vi.fn();
vi.doMock('./apply_export_transforms', () => {
  const mocked = {
    applyExportTransforms: applyExportTransformsMock,
  };
  return { ...mocked, default: mocked };
});
