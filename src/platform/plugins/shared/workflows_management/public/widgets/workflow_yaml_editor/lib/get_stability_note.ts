/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export {
  buildStabilityBadgeHtml,
  getStabilityBadgeHtml,
  STABILITY_BADGE_HEIGHT_PX,
} from './stability/get_stability_badge_html';

<<<<<<< HEAD
export { setStabilityBadgeThemeContext } from './stability/stability_badge_theme';

export { getExtensionStepStability } from './stability/get_extension_step_stability';
export type { StepStabilitySource } from './stability/get_extension_step_stability';
=======
/**
 * Returns a markdown blockquote stability note.
 */
export function getStabilityNote(stability: StepStabilityLevel | undefined): string {
  if (stability === 'tech_preview') {
    const flaskImg = `<img src="${HardcodedIcons.flask}" width="11" height="11" alt="" style="vertical-align: middle;" />`;
    const label = i18n.translate('workflows.techPreviewStabilityNote.label', {
      defaultMessage: 'Tech Preview',
    });
    const description = i18n.translate('workflows.techPreviewStabilityNote.description', {
      defaultMessage:
        'This functionality is experimental and not supported. It may change or be removed at any time.',
    });
    return `> ${flaskImg} **${label}**: ${description}`;
  }
  if (stability === 'beta') {
    const betaImg = `<img src="${HardcodedIcons.beta}" width="11" height="11" alt="" style="vertical-align: middle;" />`;
    const label = i18n.translate('workflows.betaStabilityNote.label', {
      defaultMessage: 'Beta',
    });
    const message = i18n.translate('workflows.betaStabilityNote.description', {
      defaultMessage:
        'This functionality is still under development and not ready for production usage.',
    });
    return `> ${betaImg} **${label}** — ${message}`;
  }
  return '';
}
>>>>>>> 9.4
