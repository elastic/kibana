/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export const ExperimentsStrings = {
  Components: {
    Switch: {
      getKibanaSwitchText: () => ({
        name: i18n.translate('presentationUtil.experiments.components.kibanaSwitchName', {
          defaultMessage: 'Kibana',
        }),
        help: i18n.translate('presentationUtil.experiments.components.kibanaSwitchHelp', {
          defaultMessage: 'Sets the corresponding Advanced Setting for this experiment in Kibana',
        }),
      }),
      getBrowserSwitchText: () => ({
        name: i18n.translate('presentationUtil.experiments.components.browserSwitchName', {
          defaultMessage: 'Browser',
        }),
        help: i18n.translate('presentationUtil.experiments.components.browserSwitchHelp', {
          defaultMessage:
            'Enables or disables the experiment for the browser; persists between browser instances',
        }),
      }),
      getSessionSwitchText: () => ({
        name: i18n.translate('presentationUtil.experiments.components.sessionSwitchName', {
          defaultMessage: 'Session',
        }),
        help: i18n.translate('presentationUtil.experiments.components.sessionSwitchHelp', {
          defaultMessage:
            'Enables or disables the experiment for this tab; resets when the browser tab is closed',
        }),
      }),
    },
    Badge: {
      getEnabledLabel: () =>
        i18n.translate('presentationUtil.experiments.components.enabledBadgeLabel', {
          defaultMessage: 'enabled',
        }),
      getDisabledLabel: () =>
        i18n.translate('presentationUtil.experiments.components.disabledBadgeLabel', {
          defaultMessage: 'disabled',
        }),
      getActiveLabel: () =>
        i18n.translate('presentationUtil.experiments.components.activeBadgeLabel', {
          defaultMessage: 'active',
        }),
      getInactiveLabel: () =>
        i18n.translate('presentationUtil.experiments.components.inactiveBadgeLabel', {
          defaultMessage: 'inactive',
        }),
    },
    Popover: {
      getResetButtonLabel: () =>
        i18n.translate('presentationUtil.experiments.components.resetButtonLabel', {
          defaultMessage: 'Reset',
        }),
      getCalloutHelp: () =>
        i18n.translate('presentationUtil.experiments.components.calloutHelp', {
          defaultMessage: 'Refresh to apply changes',
        }),
    },
  },
};
