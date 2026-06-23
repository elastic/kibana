/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * `data-test-subj` values owned by the app header. The real components and test consumers both
 * import these so the rendered subjects and the subjects asserted in tests cannot drift apart.
 *
 * Covers the header's structural slots and the static app-menu items the header itself injects
 * (documentation, feedback, add integrations). Tab and badge subjects, and items the caller passes
 * via `menu`, are caller-provided and are intentionally not part of this contract.
 */
export const APP_HEADER_TEST_SUBJECTS = {
  root: 'appHeader',
  title: 'appHeaderTitle',
  titleInput: 'appHeaderTitleInput',
  titleError: 'appHeaderTitleError',
  titleButton: 'appHeaderTitleButton',
  titleActions: 'appHeaderTitleActions',
  sharePrefix: 'appHeaderShare',
  favorite: 'appHeaderFavorite',
  metadata: 'appHeaderMetadata',
  tabs: 'appHeaderTabs',
  back: 'appHeaderBack',
  menuDocumentation: 'appHeaderMenuDocumentation',
  menuFeedback: 'appHeaderMenuFeedback',
  menuAddIntegrations: 'appHeaderMenuAddIntegrations',
} as const;
