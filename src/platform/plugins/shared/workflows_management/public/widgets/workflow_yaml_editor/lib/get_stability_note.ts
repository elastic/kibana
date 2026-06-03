/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { StepStabilityLevel } from '@kbn/workflows';

const BADGE_HEIGHT_PX = 18;

function escapeSvgText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeHtmlAttribute(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

/**
 * Monaco hover sanitizes span class/style attributes; render the badge as SVG instead.
 */
function buildStabilityBadgeHtml(label: string): string {
  const escapedLabel = escapeSvgText(label);
  const width = Math.max(48, Math.ceil(label.length * 6.5) + 20);
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${BADGE_HEIGHT_PX}" viewBox="0 0 ${width} ${BADGE_HEIGHT_PX}">`,
    `<rect x="0.5" y="0.5" width="${width - 1}" height="${BADGE_HEIGHT_PX - 1}" rx="8.5" fill="#fff" stroke="#69707D" stroke-opacity="0.2"/>`,
    `<text x="${width / 2}" y="13" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="11" font-weight="600" fill="#343741">${escapedLabel}</text>`,
    '</svg>',
  ].join('');
  const dataUrl = `data:image/svg+xml,${encodeURIComponent(svg)}`;

  return `<img src="${dataUrl}" alt="${escapeHtmlAttribute(label)}" width="${width}" height="${BADGE_HEIGHT_PX}" />`;
}

/**
 * Returns HTML for a compact stability badge (matches actions menu EuiBetaBadge).
 */
export function getStabilityNote(stability: StepStabilityLevel | undefined): string {
  if (stability === 'tech_preview') {
    const label = i18n.translate('workflows.actionsMenu.techPreviewBadge', {
      defaultMessage: 'Tech preview',
    });
    return buildStabilityBadgeHtml(label);
  }
  if (stability === 'beta') {
    const label = i18n.translate('workflows.actionsMenu.betaBadge', {
      defaultMessage: 'Beta',
    });
    return buildStabilityBadgeHtml(label);
  }
  return '';
}
