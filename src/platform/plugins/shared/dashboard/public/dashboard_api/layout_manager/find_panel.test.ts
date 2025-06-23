/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getMockPanels, getMockPanelsWithSections } from '../../mocks';
import { findPanel } from './find_panel';

describe('findPanel', () => {
  test('should find panel', () => {
    const panel = findPanel(getMockPanels(), '2');
    expect(panel?.panelConfig?.title).toBe('panel Two');
  });

  test('should find panel in section', () => {
    const panel = findPanel(getMockPanelsWithSections(), '4');
    expect(panel?.panelConfig?.title).toBe('panel Four');
  });
});
