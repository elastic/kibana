/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

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
    List: {
      getNoExperimentsMessage: () =>
        i18n.translate('presentationUtil.experiments.components.noExperimentsMessage', {
          defaultMessage: 'No available experiments',
        }),
    },
    ListItem: {
      getOverrideLegend: () =>
        i18n.translate('presentationUtil.experiments.components.overrideFlagsLabel', {
          defaultMessage: 'Override flags',
        }),
      getEnabledStatusMessage: () => (
        <FormattedMessage
          id="presentationUtil.experiments.components.defaultStatusMessage"
          defaultMessage="{status} by default"
          values={{
            status: <strong>Enabled</strong>,
          }}
          description="Displays the current status of an experiment"
        />
      ),
      getDisabledStatusMessage: () => (
        <FormattedMessage
          id="presentationUtil.experiments.components.defaultStatusMessage"
          defaultMessage="{status} by default"
          values={{
            status: <strong>Disabled</strong>,
          }}
          description="Displays the current status of an experiment"
        />
      ),
    },
    Flyout: {
      getTitleLabel: () =>
        i18n.translate('presentationUtil.experiments.components.titleLabel', {
          defaultMessage: 'Available experiments',
        }),
      getResetToDefaultLabel: () =>
        i18n.translate('presentationUtil.experiments.components.resetToDefaultLabel', {
          defaultMessage: 'Reset to defaults',
        }),
      getExperimentFlagsLabel: () =>
        i18n.translate('presentationUtil.experiments.components.experimentFlagsLabel', {
          defaultMessage: 'Experiment flags',
        }),
      getRefreshLabel: () =>
        i18n.translate('presentationUtil.experiments.components.calloutHelp', {
          defaultMessage: 'Refresh to apply changes',
        }),
    },
  },
};
