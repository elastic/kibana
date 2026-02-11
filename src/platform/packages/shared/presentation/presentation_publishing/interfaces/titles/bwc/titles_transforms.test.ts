/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { transformTitlesOut } from './titles_transforms';

describe('transformTitlesOut', () => {
  it('should transform legacy hidePanelTitles to hide_title', () => {
    const state = { hidePanelTitles: true, title: 'Test Title' };
    const result = transformTitlesOut(state);
    expect(result).toEqual({ hide_title: true, title: 'Test Title' });
  });

  it('should preserve hide_title over hidePanelTitles when both are present', () => {
    const state = { hidePanelTitles: false, hide_title: true, title: 'Test' };
    const result = transformTitlesOut(state);
    expect(result).toEqual({ hide_title: true, title: 'Test' });
  });

  it('should return hide_title when only hide_title is present', () => {
    const state = { hide_title: false, title: 'Test' };
    const result = transformTitlesOut(state);
    expect(result).toEqual({ hide_title: false, title: 'Test' });
  });

  it('should preserve all non-title properties', () => {
    const state = {
      hidePanelTitles: true,
      title: 'Test',
      description: 'Desc',
      foo: 'woo',
      woo: 'foo',
    };
    const result = transformTitlesOut(state);
    expect(result).toEqual({
      hide_title: true,
      title: 'Test',
      description: 'Desc',
      foo: 'woo',
      woo: 'foo',
    });
  });
});
