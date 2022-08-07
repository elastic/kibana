/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { shouldLoadNextDocPatch } from './should_load_next_doc_patch';

describe('shouldLoadNextDocPatch', () => {
  test('next patch should not be loaded', () => {
    const scrollingDomEl = {
      scrollHeight: 500,
      scrollTop: 100,
      clientHeight: 100,
    } as HTMLElement;

    expect(shouldLoadNextDocPatch(scrollingDomEl)).toBeFalsy();
  });

  test('next patch should be loaded', () => {
    const scrollingDomEl = {
      scrollHeight: 500,
      scrollTop: 350,
      clientHeight: 100,
    } as HTMLElement;

    expect(shouldLoadNextDocPatch(scrollingDomEl)).toBeTruthy();
  });

  test("next patch should be loaded even there's a decimal scroll height", () => {
    const scrollingDomEl = {
      scrollHeight: 500,
      scrollTop: 350.34234234,
      clientHeight: 100,
    } as HTMLElement;

    expect(shouldLoadNextDocPatch(scrollingDomEl)).toBeTruthy();
  });
});
