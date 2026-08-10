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
import { UNAVAILABLE_CONNECTOR_ACTION_LABEL } from '../lib/autocomplete/connector_action_availability';
import { STABILITY_BADGE_HEIGHT_PX } from '../lib/get_stability_note';

const SUGGEST_ROW_PREFIX = '.monaco-editor .suggest-widget .monaco-list .monaco-list-row';

const BADGE_SIZE_PX = STABILITY_BADGE_HEIGHT_PX;
const ICON_SIZE_PX = 10;

function escapeCssAttributeValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function buildSuggestBadgeRule(
  selector: string,
  iconUrl: string,
  euiThemeContext: UseEuiTheme
): string {
  const { euiTheme } = euiThemeContext;

  return `
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
      background-image: url('${iconUrl}');
      background-size: ${ICON_SIZE_PX}px ${ICON_SIZE_PX}px;
      background-repeat: no-repeat;
      background-position: center;
    }
  `;
}

/**
 * Appends a tech preview flask badge after the suggest label text.
 * Uses `.left::after` only — does not modify `.monaco-icon-label` or `.suggest-icon`.
 */
export function buildSuggestTechPreviewBadgeRules(
  ariaLabelPrefixes: readonly string[],
  euiThemeContext: UseEuiTheme
): string {
  return ariaLabelPrefixes
    .map((prefix) => {
      const escapedPrefix = escapeCssAttributeValue(prefix);
      const selector = `${SUGGEST_ROW_PREFIX}[aria-label^="${escapedPrefix}"]`;
      return buildSuggestBadgeRule(selector, HardcodedIcons.flask, euiThemeContext);
    })
    .join('');
}

/** Appends a neutral availability badge after unavailable connector action labels. */
export function buildSuggestUnavailableBadgeRules(euiThemeContext: UseEuiTheme): string {
  const escapedLabel = escapeCssAttributeValue(UNAVAILABLE_CONNECTOR_ACTION_LABEL);
  const selector = `${SUGGEST_ROW_PREFIX}[aria-label*="${escapedLabel}"]`;
  const { euiTheme } = euiThemeContext;

  return `
    ${buildSuggestBadgeRule(selector, HardcodedIcons.alert, euiThemeContext)}
    ${selector} .main > .left,
    ${selector} .main > .right > .details-label {
      color: ${euiTheme.colors.textSubdued} !important;
    }
  `;
}
