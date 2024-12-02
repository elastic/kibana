/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ActionType } from '@kbn/actions-types';
import {
  checkActionTypeEnabled,
  checkActionFormActionTypeEnabled,
} from './check_action_type_enabled';
import { PreConfiguredActionConnector } from '../../common';

describe('checkActionTypeEnabled', () => {
  test(`returns isEnabled:true when action type isn't provided`, async () => {
    expect(checkActionTypeEnabled()).toMatchInlineSnapshot(`
          Object {
            "isEnabled": true,
          }
      `);
  });

  test('returns isEnabled:true when action type is enabled', async () => {
    const actionType: ActionType = {
      id: '1',
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      name: 'my action',
      enabled: true,
      enabledInConfig: true,
      enabledInLicense: true,
      isSystemActionType: false,
    };
    expect(checkActionTypeEnabled(actionType)).toMatchInlineSnapshot(`
          Object {
            "isEnabled": true,
          }
      `);
  });

  test('returns isEnabled:false when action type is disabled by license', async () => {
    const actionType: ActionType = {
      id: '1',
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      name: 'my action',
      enabled: false,
      enabledInConfig: true,
      enabledInLicense: false,
      isSystemActionType: false,
    };
    expect(checkActionTypeEnabled(actionType)).toMatchInlineSnapshot(`
      Object {
        "isEnabled": false,
        "message": "This connector requires a Basic license.",
        "messageCard": <EuiCard
          className="actCheckActionTypeEnabled__disabledActionWarningCard"
          description="To re-enable this action, please upgrade your license."
          title="This feature requires a Basic license."
          titleSize="xs"
        >
          <EuiLink
            href="https://www.elastic.co/subscriptions"
            target="_blank"
          >
            <Memo(MemoizedFormattedMessage)
              defaultMessage="View license options"
              id="alertsUIShared.licenseCheck.actionTypeDisabledByLicenseLinkTitle"
            />
          </EuiLink>
        </EuiCard>,
      }
    `);
  });

  test('returns isEnabled:false when action type is disabled by config', async () => {
    const actionType: ActionType = {
      id: '1',
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      name: 'my action',
      enabled: false,
      enabledInConfig: false,
      enabledInLicense: true,
      isSystemActionType: false,
    };
    expect(checkActionTypeEnabled(actionType)).toMatchInlineSnapshot(`
          Object {
            "isEnabled": false,
            "message": "This connector is disabled by the Kibana configuration.",
            "messageCard": <EuiCard
              className="actCheckActionTypeEnabled__disabledActionWarningCard"
              description=""
              title="This feature is disabled by the Kibana configuration."
            />,
          }
      `);
  });
  test('checkActionTypeEnabled returns true when actionType is disabled by config', async () => {
    const actionType: ActionType = {
      id: '1',
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      name: 'my action',
      enabled: false,
      enabledInConfig: false,
      enabledInLicense: true,
      isSystemActionType: false,
    };

    const isPreconfiguredConnector = true;

    expect(checkActionTypeEnabled(actionType, isPreconfiguredConnector)).toMatchInlineSnapshot(`
      Object {
        "isEnabled": true,
      }
  `);
  });
});

describe('checkActionFormActionTypeEnabled', () => {
  const preconfiguredConnectors: PreConfiguredActionConnector[] = [
    {
      actionTypeId: '1',
      id: 'test1',
      isPreconfigured: true,
      isSystemAction: false,
      isDeprecated: true,
      name: 'test',
      referencedByCount: 0,
    },
    {
      actionTypeId: '2',
      id: 'test2',
      isPreconfigured: true,
      isDeprecated: true,
      isSystemAction: false,
      name: 'test',
      referencedByCount: 0,
    },
  ];

  test('returns isEnabled:true when action type is preconfigured', async () => {
    const actionType: ActionType = {
      id: '1',
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      name: 'my action',
      enabled: true,
      enabledInConfig: false,
      enabledInLicense: true,
      isSystemActionType: false,
    };

    expect(checkActionFormActionTypeEnabled(actionType, preconfiguredConnectors))
      .toMatchInlineSnapshot(`
          Object {
            "isEnabled": true,
          }
      `);
  });

  test('returns isEnabled:false when action type is disabled by config and not preconfigured', async () => {
    const actionType: ActionType = {
      id: 'disabled-by-config',
      minimumLicenseRequired: 'basic',
      supportedFeatureIds: ['alerting'],
      name: 'my action',
      enabled: true,
      enabledInConfig: false,
      enabledInLicense: true,
      isSystemActionType: false,
    };
    expect(checkActionFormActionTypeEnabled(actionType, preconfiguredConnectors))
      .toMatchInlineSnapshot(`
          Object {
            "isEnabled": false,
            "message": "This connector is disabled by the Kibana configuration.",
            "messageCard": <EuiCard
              className="actCheckActionTypeEnabled__disabledActionWarningCard"
              description=""
              title="This feature is disabled by the Kibana configuration."
            />,
          }
      `);
  });
});
