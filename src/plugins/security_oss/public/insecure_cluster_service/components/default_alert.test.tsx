/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { defaultAlertText } from './default_alert';

describe('defaultAlertText', () => {
  it('creates a valid MountPoint that can cleanup correctly', () => {
    const mountPoint = defaultAlertText(jest.fn());

    const el = document.createElement('div');
    const unmount = mountPoint(el);

    expect(el.querySelectorAll('[data-test-subj="insecureClusterDefaultAlertText"]')).toHaveLength(
      1
    );

    unmount();

    expect(el).toMatchInlineSnapshot(`<div />`);
  });
});
