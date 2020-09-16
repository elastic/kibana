/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { useState } from 'react';

import { EuiIcon, EuiFlexItem, EuiCard, EuiFlexGroup } from '@elastic/eui';

import {
  AlertsContextProvider,
  AlertAdd,
} from '../../../../x-pack/plugins/triggers_actions_ui/public';
import { AlertingExampleComponentParams } from '../application';
import { ALERTING_EXAMPLE_APP_ID } from '../../common/constants';

export const CreateAlert = ({
  http,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  triggersActionsUi,
  charts,
  uiSettings,
  docLinks,
  data,
  toastNotifications,
  capabilities,
}: AlertingExampleComponentParams) => {
  const [alertFlyoutVisible, setAlertFlyoutVisibility] = useState<boolean>(false);

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={false}>
        <EuiCard
          icon={<EuiIcon size="xxl" type={`bell`} />}
          title={`Create Alert`}
          description="Create an new Alert based on one of our example Alert Types ."
          onClick={() => setAlertFlyoutVisibility(true)}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <AlertsContextProvider
          value={{
            http,
            actionTypeRegistry: triggersActionsUi.actionTypeRegistry,
            alertTypeRegistry: triggersActionsUi.alertTypeRegistry,
            toastNotifications,
            uiSettings,
            docLinks,
            charts,
            dataFieldsFormats: data.fieldFormats,
            capabilities,
          }}
        >
          <AlertAdd
            consumer={ALERTING_EXAMPLE_APP_ID}
            addFlyoutVisible={alertFlyoutVisible}
            setAddFlyoutVisibility={setAlertFlyoutVisibility}
          />
        </AlertsContextProvider>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
