/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { upperFirst } from 'lodash';
import { i18n } from '@kbn/i18n';
import { EuiCard, EuiLink } from '@elastic/eui';
import { ActionType } from '@kbn/actions-types';
import { FormattedMessage } from '@kbn/i18n-react';
import { VIEW_LICENSE_OPTIONS_LINK } from '../../common/constants';

export const getLicenseCheckResult = (actionType: ActionType) => {
  return {
    isEnabled: false,
    message: i18n.translate(
      'alertsUIShared.checkActionTypeEnabled.actionTypeDisabledByLicenseMessage',
      {
        defaultMessage: 'This connector requires a {minimumLicenseRequired} license.',
        values: {
          minimumLicenseRequired: upperFirst(actionType.minimumLicenseRequired),
        },
      }
    ),
    messageCard: (
      <EuiCard
        titleSize="xs"
        title={i18n.translate(
          'alertsUIShared.licenseCheck.actionTypeDisabledByLicenseMessageTitle',
          {
            defaultMessage: 'This feature requires a {minimumLicenseRequired} license.',
            values: {
              minimumLicenseRequired: upperFirst(actionType.minimumLicenseRequired),
            },
          }
        )}
        // The "re-enable" terminology is used here because this message is used when an alert
        // action was previously enabled and needs action to be re-enabled.
        description={i18n.translate(
          'alertsUIShared.licenseCheck.actionTypeDisabledByLicenseMessageDescription',
          { defaultMessage: 'To re-enable this action, please upgrade your license.' }
        )}
        className="actCheckActionTypeEnabled__disabledActionWarningCard"
        children={
          <EuiLink href={VIEW_LICENSE_OPTIONS_LINK} target="_blank">
            <FormattedMessage
              defaultMessage="View license options"
              id="alertsUIShared.licenseCheck.actionTypeDisabledByLicenseLinkTitle"
            />
          </EuiLink>
        }
      />
    ),
  };
};

export const configurationCheckResult = {
  isEnabled: false,
  message: i18n.translate(
    'alertsUIShared.checkActionTypeEnabled.actionTypeDisabledByConfigMessage',
    { defaultMessage: 'This connector is disabled by the Kibana configuration.' }
  ),
  messageCard: (
    <EuiCard
      title={i18n.translate('alertsUIShared.licenseCheck.actionTypeDisabledByConfigMessageTitle', {
        defaultMessage: 'This feature is disabled by the Kibana configuration.',
      })}
      description=""
      className="actCheckActionTypeEnabled__disabledActionWarningCard"
    />
  ),
};
