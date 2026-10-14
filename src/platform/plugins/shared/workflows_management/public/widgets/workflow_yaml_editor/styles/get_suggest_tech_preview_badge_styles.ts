/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import { HardcodedIcons } from '@kbn/workflows-ui';
import { STABILITY_BADGE_HEIGHT_PX } from '../lib/get_stability_note';

const SUGGEST_ROW_PREFIX = '.monaco-editor .suggest-widget .monaco-list .monaco-list-row';

const BADGE_SIZE_PX = STABILITY_BADGE_HEIGHT_PX;
const FLASK_SIZE_PX = 10;

function escapeCssAttributeValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Appends a tech preview flask badge after the suggest label text.
 * Uses `.left::after` only — does not modify `.monaco-icon-label` or `.suggest-icon`.
 */
export function buildSuggestTechPreviewBadgeRules(
  ariaLabelPrefixes: readonly string[],
  euiThemeContext: UseEuiTheme
): string {
  const { euiTheme } = euiThemeContext;
  const flaskUrl = HardcodedIcons.flask;

  let css = '';

  for (const prefix of ariaLabelPrefixes) {
    const escapedPrefix = escapeCssAttributeValue(prefix);
    const selector = `${SUGGEST_ROW_PREFIX}[aria-label^="${escapedPrefix}"]`;

    css += `
      ${selector} .main > .left::after {
        content: '';
        display: inline-block;
        flex-shrink: 0;
        align-self: center;
        box-sizing: border-box;
        width: ${BADGE_SIZE_PX}px;
        height: ${BADGE_SIZE_PX}px;
        margin-left: 0px;
        border-radius: 50%;
        border: 1px solid ${euiTheme.components.badgeBorderColorHollow};
        background-color: ${euiTheme.colors.backgroundBasePlain};
        background-image: url('${flaskUrl}');
        background-size: ${FLASK_SIZE_PX}px ${FLASK_SIZE_PX}px;
        background-repeat: no-repeat;
        background-position: center;
      }
    `;
  }

  return css;
}
