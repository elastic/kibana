/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getFocusableElements } from './get_focusable_elements';

describe('getFocusableElements', () => {
  it('returns only buttons and links that are focusable', () => {
    const container = document.createElement('div');

    const visibleButton = document.createElement('button');
    const disabledButton = document.createElement('button');
    disabledButton.setAttribute('disabled', 'true');

    const visibleLink = document.createElement('a');
    const hiddenLink = document.createElement('a');
    hiddenLink.setAttribute('aria-hidden', 'true');

    const div = document.createElement('div');

    container.append(visibleButton, disabledButton, visibleLink, hiddenLink, div);

    const focusable = getFocusableElements(container);

    expect(focusable).toEqual([visibleButton, visibleLink]);
  });
});
