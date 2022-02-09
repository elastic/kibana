/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCode } from '@elastic/eui';

export const LabsStrings = {
  Components: {
    Switch: {
      getKibanaSwitchText: () => ({
        name: i18n.translate('presentationUtil.labs.components.kibanaSwitchName', {
          defaultMessage: 'Kibana',
        }),
        help: i18n.translate('presentationUtil.labs.components.kibanaSwitchHelp', {
          defaultMessage: 'Enables this lab for all Kibana users.',
        }),
      }),
      getBrowserSwitchText: () => ({
        name: i18n.translate('presentationUtil.labs.components.browserSwitchName', {
          defaultMessage: 'Browser',
        }),
        help: i18n.translate('presentationUtil.labs.components.browserSwitchHelp', {
          defaultMessage: 'Enables the lab for this browser and persists after it closes.',
        }),
      }),
      getSessionSwitchText: () => ({
        name: i18n.translate('presentationUtil.labs.components.sessionSwitchName', {
          defaultMessage: 'Session',
        }),
        help: i18n.translate('presentationUtil.labs.components.sessionSwitchHelp', {
          defaultMessage: 'Enables the lab for this browser session, so it resets when it closes.',
        }),
      }),
    },
    List: {
      getNoProjectsMessage: () =>
        i18n.translate('presentationUtil.labs.components.noProjectsMessage', {
          defaultMessage: 'No labs currently available.',
        }),
      getNoProjectsInSolutionMessage: (solutionName: string) =>
        i18n.translate('presentationUtil.labs.components.noProjectsinSolutionMessage', {
          defaultMessage: 'No labs currently in {solutionName}.',
          values: {
            solutionName,
          },
        }),
    },
    ListItem: {
      getOverrideLegend: () =>
        i18n.translate('presentationUtil.labs.components.overrideFlagsLabel', {
          defaultMessage: 'Overrides',
        }),
      getOverriddenIconTipLabel: () =>
        i18n.translate('presentationUtil.labs.components.overridenIconTipLabel', {
          defaultMessage: 'Default overridden',
        }),
      getEnabledStatusMessage: () => (
        <FormattedMessage
          id="presentationUtil.labs.components.enabledStatusMessage"
          defaultMessage="Default: {status}"
          values={{
            status: <EuiCode>Enabled</EuiCode>,
          }}
          description="Displays the enabled status of a lab project"
        />
      ),
      getDisabledStatusMessage: () => (
        <FormattedMessage
          id="presentationUtil.labs.components.disabledStatusMessage"
          defaultMessage="Default: {status}"
          values={{
            status: <EuiCode>Disabled</EuiCode>,
          }}
          description="Displays the disabled status of a lab project"
        />
      ),
    },
    Flyout: {
      getTitleLabel: () =>
        i18n.translate('presentationUtil.labs.components.titleLabel', {
          defaultMessage: 'Labs',
        }),
      getDescriptionMessage: () =>
        i18n.translate('presentationUtil.labs.components.descriptionMessage', {
          defaultMessage: 'Try out features that are in progress or in technical preview.',
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
      getCloseButtonLabel: () =>
        i18n.translate('presentationUtil.labs.components.closeButtonLabel', {
          defaultMessage: 'Close',
        }),
    },
  },
};
