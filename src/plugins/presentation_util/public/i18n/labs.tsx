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

export const LabsStrings = {
  Components: {
    Switch: {
      getKibanaSwitchText: () => ({
        name: i18n.translate('presentationUtil.labs.components.kibanaSwitchName', {
          defaultMessage: 'Kibana',
        }),
        help: i18n.translate('presentationUtil.labs.components.kibanaSwitchHelp', {
          defaultMessage: 'Sets the corresponding Advanced Setting for this lab project in Kibana',
        }),
      }),
      getBrowserSwitchText: () => ({
        name: i18n.translate('presentationUtil.labs.components.browserSwitchName', {
          defaultMessage: 'Browser',
        }),
        help: i18n.translate('presentationUtil.labs.components.browserSwitchHelp', {
          defaultMessage:
            'Enables or disables the lab project for the browser; persists between browser instances',
        }),
      }),
      getSessionSwitchText: () => ({
        name: i18n.translate('presentationUtil.labs.components.sessionSwitchName', {
          defaultMessage: 'Session',
        }),
        help: i18n.translate('presentationUtil.labs.components.sessionSwitchHelp', {
          defaultMessage:
            'Enables or disables the lab project for this tab; resets when the browser tab is closed',
        }),
      }),
    },
    List: {
      getNoProjectsMessage: () =>
        i18n.translate('presentationUtil.labs.components.noProjectsMessage', {
          defaultMessage: 'No available lab projects',
        }),
    },
    ListItem: {
      getOverrideLegend: () =>
        i18n.translate('presentationUtil.labs.components.overrideFlagsLabel', {
          defaultMessage: 'Override flags',
        }),
      getEnabledStatusMessage: () => (
        <FormattedMessage
          id="presentationUtil.labs.components.defaultStatusMessage"
          defaultMessage="{status} by default"
          values={{
            status: <strong>Enabled</strong>,
          }}
          description="Displays the current status of a lab project"
        />
      ),
      getDisabledStatusMessage: () => (
        <FormattedMessage
          id="presentationUtil.labs.components.defaultStatusMessage"
          defaultMessage="{status} by default"
          values={{
            status: <strong>Disabled</strong>,
          }}
          description="Displays the current status of a lab project"
        />
      ),
    },
    Flyout: {
      getTitleLabel: () =>
        i18n.translate('presentationUtil.labs.components.titleLabel', {
          defaultMessage: 'Lab projects',
        }),
      getResetToDefaultLabel: () =>
        i18n.translate('presentationUtil.labs.components.resetToDefaultLabel', {
          defaultMessage: 'Reset to defaults',
        }),
      getLabFlagsLabel: () =>
        i18n.translate('presentationUtil.labs.components.labFlagsLabel', {
          defaultMessage: 'Lab flags',
        }),
      getRefreshLabel: () =>
        i18n.translate('presentationUtil.labs.components.calloutHelp', {
          defaultMessage: 'Refresh to apply changes',
        }),
    },
  },
};
