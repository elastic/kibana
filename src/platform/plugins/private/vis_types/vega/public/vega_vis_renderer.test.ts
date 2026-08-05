/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { shouldUseSandboxedVegaRendering } from './vega_vis_renderer';

describe('shouldUseSandboxedVegaRendering', () => {
  it('uses sandbox only when the flag is enabled and the spec is not a map', () => {
    expect(
      shouldUseSandboxedVegaRendering({ sandboxedRenderingEnabled: false, useMap: false })
    ).toBe(false);
    expect(
      shouldUseSandboxedVegaRendering({ sandboxedRenderingEnabled: false, useMap: true })
    ).toBe(false);
    expect(shouldUseSandboxedVegaRendering({ sandboxedRenderingEnabled: true, useMap: true })).toBe(
      false
    );
    expect(
      shouldUseSandboxedVegaRendering({ sandboxedRenderingEnabled: true, useMap: false })
    ).toBe(true);
  });
});
