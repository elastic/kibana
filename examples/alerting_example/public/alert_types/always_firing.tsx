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

import React, { Fragment } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFieldNumber, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AlertTypeModel } from '../../../../x-pack/plugins/triggers_actions_ui/public';
import { DEFAULT_INSTANCES_TO_GENERATE } from '../../common/constants';

interface AlwaysFiringParamsProps {
  alertParams: { instances?: number };
  setAlertParams: (property: string, value: any) => void;
  errors: { [key: string]: string[] };
}

export function getAlertType(): AlertTypeModel {
  return {
    id: 'example.always-firing',
    name: 'Always Fires',
    iconClass: 'bolt',
    alertParamsExpression: AlwaysFiringExpression,
    validate: (alertParams: AlwaysFiringParamsProps['alertParams']) => {
      const { instances } = alertParams;
      const validationResult = {
        errors: {
          instances: new Array<string>(),
        },
      };
      if (instances && instances < 0) {
        validationResult.errors.instances.push(
          i18n.translate('AlertingExample.addAlert.error.invalidRandomInstances', {
            defaultMessage: 'instances must be equal or greater than zero.',
          })
        );
      }
      return validationResult;
    },
    requiresAppContext: false,
  };
}

export const AlwaysFiringExpression: React.FunctionComponent<AlwaysFiringParamsProps> = ({
  alertParams,
  setAlertParams,
}) => {
  const { instances = DEFAULT_INSTANCES_TO_GENERATE } = alertParams;
  return (
    <Fragment>
      <EuiFlexGroup gutterSize="s" wrap direction="column">
        <EuiFlexItem grow={true}>
          <EuiFormRow
            label="Random Instances to generate"
            helpText="How many randomly generated Alert Instances do you wish to activate on each alert run?"
          >
            <EuiFieldNumber
              name="instances"
              value={instances}
              onChange={(event) => {
                setAlertParams('instances', event.target.valueAsNumber);
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </Fragment>
  );
};
