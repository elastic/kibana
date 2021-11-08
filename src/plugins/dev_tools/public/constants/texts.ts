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
    home: i18n.translate('xpack.devtools.breadcrumb.homeLabel', {
      defaultMessage: 'Dev Tools',
    }),
    console: i18n.translate('xpack.upgradeAssistant.breadcrumb.consoleLabel', {
      defaultMessage: 'Console',
    }),
    searchProfiler: i18n.translate('xpack.upgradeAssistant.breadcrumb.searchProfilerLabel', {
      defaultMessage: 'Search Profiler',
    }),
    grokDebugger: i18n.translate('xpack.upgradeAssistant.breadcrumb.grokDebuggerLabel', {
      defaultMessage: 'Grok Debugger',
    }),
    painlessLab: i18n.translate('xpack.upgradeAssistant.breadcrumb.painlessLabLabel', {
      defaultMessage: 'Painless Lab',
    }),
  },
};
