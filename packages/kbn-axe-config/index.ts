/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ReporterVersion } from 'axe-core';

export const AXE_CONFIG = {
  rules: [
    {
      id: 'scrollable-region-focusable',
      selector: '[data-skip-axe="scrollable-region-focusable"]',
    },
    {
      id: 'aria-required-children',
      selector: '[data-skip-axe="aria-required-children"] > *',
    },
    {
      id: 'label',
      selector: '[data-test-subj="comboBoxSearchInput"] *',
    },
    {
      id: 'aria-roles',
      selector: '[data-test-subj="comboBoxSearchInput"] *',
    },
    {
      // 3rd-party library; button has aria-describedby
      id: 'button-name',
      selector: '[data-rbd-drag-handle-draggable-id]',
    },
  ],
};

export const AXE_OPTIONS = {
  reporter: 'v2' as ReporterVersion,
  runOnly: ['wcag2a', 'wcag2aa'],
  rules: {
    'color-contrast': {
      enabled: false, // disabled because we have too many failures
    },
    bypass: {
      enabled: false, // disabled because it's too flaky
    },
    'nested-interactive': {
      enabled: false, // tracker here - https://github.com/elastic/kibana/issues/152494 disabled because we have too many failures on interactive controls
    },
  },
};
