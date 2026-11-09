/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const GUIDANCE_MENU_LABEL = i18n.translate('discover.profile.security.hunt.guidanceLabel', {
  defaultMessage: 'Hunt guidance',
});

export const GUIDANCE_FLYOUT_TITLE = i18n.translate(
  'discover.profile.security.hunt.guidanceFlyoutTitle',
  { defaultMessage: 'Hunt guidance' }
);

export const HYPOTHESIS_HEADING = i18n.translate('discover.profile.security.hunt.hypothesis', {
  defaultMessage: 'Hypothesis',
});

export const ANALYST_NOTES_HEADING = i18n.translate('discover.profile.security.hunt.analystNotes', {
  defaultMessage: 'Analyst notes',
});

export const FALSE_POSITIVES_HEADING = i18n.translate(
  'discover.profile.security.hunt.expectedFalsePositives',
  { defaultMessage: 'Expected false positives' }
);

export const PIVOTS_HEADING = i18n.translate('discover.profile.security.hunt.suggestedPivots', {
  defaultMessage: 'Suggested pivots',
});

export const REFERENCES_HEADING = i18n.translate('discover.profile.security.hunt.references', {
  defaultMessage: 'References',
});

export const PRESERVE_ACTION_LABEL = i18n.translate(
  'discover.profile.security.hunt.preserveAction',
  { defaultMessage: 'Preserve as Investigation' }
);

export const APPEND_ACTION_LABEL = i18n.translate('discover.profile.security.hunt.appendAction', {
  defaultMessage: 'Add evidence to Investigation',
});

export const TOO_MANY_ROWS = (max: number) =>
  i18n.translate('discover.profile.security.hunt.tooManyRows', {
    defaultMessage: 'Select at most {max} rows to preserve at once.',
    values: { max },
  });

export const EVIDENCE_PREVIEW_TITLE = i18n.translate(
  'discover.profile.security.hunt.evidencePreviewTitle',
  { defaultMessage: 'Selected evidence' }
);

export const EVIDENCE_PREVIEW_SUMMARY = (count: number) =>
  i18n.translate('discover.profile.security.hunt.evidencePreviewSummary', {
    defaultMessage: '{count, plural, one {# row} other {# rows}} selected.',
    values: { count },
  });

export const EVIDENCE_ID_COLUMN = i18n.translate('discover.profile.security.hunt.evidenceId', {
  defaultMessage: 'Document id',
});

export const EVIDENCE_INDEX_COLUMN = i18n.translate(
  'discover.profile.security.hunt.evidenceIndex',
  { defaultMessage: 'Index' }
);

export const EVIDENCE_PREVIEW_CANCEL = i18n.translate(
  'discover.profile.security.hunt.evidencePreviewCancel',
  { defaultMessage: 'Cancel' }
);

export const SAVE_FAILED = i18n.translate('discover.profile.security.hunt.saveFailed', {
  defaultMessage: 'The evidence could not be preserved. Try again.',
});

export const SAVED_TITLE = i18n.translate('discover.profile.security.hunt.savedTitle', {
  defaultMessage: 'Evidence preserved',
});

export const SAVED_TEXT = (added: number, total: number) =>
  i18n.translate('discover.profile.security.hunt.savedText', {
    defaultMessage:
      '{added, plural, =0 {No new rows were added} one {# row added} other {# rows added}}. The Investigation now holds {total, plural, one {# row} other {# rows}}.',
    values: { added, total },
  });

export const VIEW_INVESTIGATION = i18n.translate(
  'discover.profile.security.hunt.viewInvestigation',
  {
    defaultMessage: 'View Investigation',
  }
);

export const EVIDENCE_NOTE_LABEL = i18n.translate(
  'discover.profile.security.hunt.evidenceNoteLabel',
  {
    defaultMessage: 'Context note (optional)',
  }
);

export const EVIDENCE_NOTE_HELP = i18n.translate(
  'discover.profile.security.hunt.evidenceNoteHelp',
  {
    defaultMessage: 'Saved with this evidence and shown on the Investigation.',
  }
);

export const EVIDENCE_NOTE_PLACEHOLDER = i18n.translate(
  'discover.profile.security.hunt.evidenceNotePlaceholder',
  { defaultMessage: 'Why these rows matter, what you checked, what to look at next' }
);

export const NOT_AVAILABLE = i18n.translate('discover.profile.security.hunt.notAvailable', {
  defaultMessage: 'Hunt evidence cannot be preserved right now.',
});
