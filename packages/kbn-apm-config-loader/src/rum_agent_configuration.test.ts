/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { shouldInstrumentClient } from './rum_agent_configuration';
describe('shouldInstrumentClient', () => {
  it('returns false if apm is disabled', () => {
    expect(shouldInstrumentClient({ active: false })).toBe(false);
  });

  it('returns false if apm is enabled with contextPropagationOnly: true', () => {
    expect(shouldInstrumentClient({ active: true, contextPropagationOnly: true })).toBe(false);
  });

  it('returns false if apm is enabled with disableSend: true', () => {
    expect(shouldInstrumentClient({ active: true, disableSend: true })).toBe(false);
  });

  it('returns true if apm is enabled', () => {
    expect(shouldInstrumentClient({ active: true })).toBe(true);
    expect(shouldInstrumentClient({ active: true, contextPropagationOnly: false })).toBe(true);
    expect(shouldInstrumentClient({ active: true, disableSend: false })).toBe(true);
  });
});
