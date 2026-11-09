/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getEditorPlaceholder } from './get_editor_placeholder';

describe('getEditorPlaceholder', () => {
  it('points at the source when a visor is rendered next to the editor', () => {
    expect(getEditorPlaceholder({ hasExternalVisor: true, isNlToEsqlEnabled: true })).toBe(
      'Start typing ES|QL, beginning with FROM to choose a source'
    );
    expect(getEditorPlaceholder({ hasExternalVisor: true, isNlToEsqlEnabled: false })).toBe(
      'Start typing ES|QL, beginning with FROM to choose a source'
    );
  });

  it('advertises the comment shortcut when AI is enabled and there is no visor', () => {
    expect(getEditorPlaceholder({ isNlToEsqlEnabled: true })).toMatch(/\+J to generate the query$/);
  });

  it('falls back to the basic placeholder without AI or visor', () => {
    expect(getEditorPlaceholder({ isNlToEsqlEnabled: false })).toBe('Start typing ES|QL');
  });
});
