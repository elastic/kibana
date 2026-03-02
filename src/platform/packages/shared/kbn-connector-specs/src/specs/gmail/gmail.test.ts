/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { GmailConnector } from './gmail';

describe('GmailConnector', () => {
  it('has required metadata', () => {
    expect(GmailConnector.metadata.id).toBe('.gmail');
    expect(GmailConnector.metadata.displayName).toBe('Gmail');
    expect(GmailConnector.metadata.supportedFeatureIds).toContain('workflows');
  });

  it('exposes searchMessages, getMessage, listMessages actions', () => {
    expect(GmailConnector.actions.searchMessages).toBeDefined();
    expect(GmailConnector.actions.getMessage).toBeDefined();
    expect(GmailConnector.actions.listMessages).toBeDefined();
  });

  it('has a test handler', () => {
    expect(GmailConnector.test?.handler).toBeDefined();
  });
});
