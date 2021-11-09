/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const i18Texts = {
  breadcrumbs: {
    home: i18n.translate('devTools.breadcrumb.homeLabel', {
      defaultMessage: 'Dev Tools',
    }),
    console: i18n.translate('devTools.breadcrumb.consoleLabel', {
      defaultMessage: 'Console',
    }),
    searchprofiler: i18n.translate('devTools.breadcrumb.searchProfilerLabel', {
      defaultMessage: 'Search Profiler',
    }),
    grokdebugger: i18n.translate('devTools.breadcrumb.grokDebuggerLabel', {
      defaultMessage: 'Grok Debugger',
    }),
    painless_lab: i18n.translate('devTools.breadcrumb.painlessLabLabel', {
      defaultMessage: 'Painless Lab',
    }),
  },
};
