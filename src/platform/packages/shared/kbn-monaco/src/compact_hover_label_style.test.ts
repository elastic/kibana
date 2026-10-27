/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", and the "Server Side Public License,
 * v 1".
 */

import { ensureCompactHoverLabelStyle } from './compact_hover_label_style';

const STYLE_ELEMENT_ID = 'kbnMonacoCompactHoverLabel';

describe('ensureCompactHoverLabelStyle', () => {
  afterEach(() => {
    document.getElementById(STYLE_ELEMENT_ID)?.remove();
  });

  it('forces compact hover labels onto one line', () => {
    ensureCompactHoverLabelStyle();

    const style = document.getElementById(STYLE_ELEMENT_ID);
    expect(style?.textContent).toContain('white-space: nowrap !important');
    expect(style?.textContent).toContain('.monaco-hover.workbench-hover.compact .hover-contents');
  });

  it('installs the override once', () => {
    ensureCompactHoverLabelStyle();
    ensureCompactHoverLabelStyle();

    expect(document.querySelectorAll(`#${STYLE_ELEMENT_ID}`)).toHaveLength(1);
  });
});
