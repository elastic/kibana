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

const STYLE_ELEMENT_ID = 'kbnMonacoCompactHoverLabel';

/**
 * Installs a stylesheet that keeps Monaco's compact hover labels on one line.
 *
 * Monaco sets `white-space: pre-wrap` inline on plain-text hover contents so a
 * label can preserve newlines. The find widget's close button is absolutely
 * positioned at the right edge, and its label is "Close" plus the keybinding
 * ("Escape"). `pre-wrap` wraps that onto two lines. The taller hover is then
 * placed on top of the 16px icon and receives the click, so the find bar cannot
 * be closed. `nowrap` keeps the label on one line, which Monaco positions above
 * the icon. `!important` is required to beat the inline style.
 */
export function ensureCompactHoverLabelStyle(): void {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ELEMENT_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = STYLE_ELEMENT_ID;
  style.textContent = `
    .monaco-hover.workbench-hover.compact .hover-contents {
      white-space: nowrap !important;
    }
  `;
  document.head.appendChild(style);
}
