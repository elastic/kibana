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

import React, { useState, useEffect, Fragment } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiFieldNumber,
  EuiPopoverTitle,
  EuiSelect,
  EuiCallOut,
  EuiExpression,
  EuiTextColor,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { flatten } from 'lodash';
import { ALERTING_EXAMPLE_APP_ID, Craft, Operator } from '../../common/constants';
import { SanitizedAlert } from '../../../../x-pack/plugins/alerts/common';
import { PluginSetupContract as AlertingSetup } from '../../../../x-pack/plugins/alerts/public';
import { AlertTypeModel } from '../../../../x-pack/plugins/triggers_actions_ui/public';

export function registerNavigation(alerts: AlertingSetup) {
  alerts.registerNavigation(
    ALERTING_EXAMPLE_APP_ID,
    'example.people-in-space',
    (alert: SanitizedAlert) => `/astros/${alert.id}`
  );
}

interface PeopleinSpaceParamsProps {
  alertParams: { outerSpaceCapacity?: number; craft?: string; op?: string };
  setAlertParams: (property: string, value: any) => void;
  errors: { [key: string]: string[] };
}

function isValueInEnum(enumeratin: Record<string, any>, value: any): boolean {
  return !!Object.values(enumeratin).find((enumVal) => enumVal === value);
}

export function getAlertType(): AlertTypeModel {
  return {
    id: 'example.people-in-space',
    name: 'People Are In Space Right Now',
    iconClass: 'globe',
    alertParamsExpression: PeopleinSpaceExpression,
    validate: (alertParams: PeopleinSpaceParamsProps['alertParams']) => {
      const { outerSpaceCapacity, craft, op } = alertParams;

      const validationResult = {
        errors: {
          outerSpaceCapacity: new Array<string>(),
          craft: new Array<string>(),
        },
      };
      if (!isValueInEnum(Craft, craft)) {
        validationResult.errors.craft.push(
          i18n.translate('AlertingExample.addAlert.error.invalidCraft', {
            defaultMessage: 'You must choose one of the following Craft: {crafts}',
            values: {
              crafts: Object.values(Craft).join(', '),
            },
          })
        );
      }
      if (!(typeof outerSpaceCapacity === 'number' && outerSpaceCapacity >= 0)) {
        validationResult.errors.outerSpaceCapacity.push(
          i18n.translate('AlertingExample.addAlert.error.invalidOuterSpaceCapacity', {
            defaultMessage: 'outerSpaceCapacity must be a number greater than or equal to zero.',
          })
        );
      }
      if (!isValueInEnum(Operator, op)) {
        validationResult.errors.outerSpaceCapacity.push(
          i18n.translate('AlertingExample.addAlert.error.invalidCraft', {
            defaultMessage: 'You must choose one of the following Operator: {crafts}',
            values: {
              crafts: Object.values(Operator).join(', '),
            },
          })
        );
      }

      return validationResult;
    },
    requiresAppContext: false,
  };
}

export const PeopleinSpaceExpression: React.FunctionComponent<PeopleinSpaceParamsProps> = ({
  alertParams,
  setAlertParams,
  errors,
}) => {
  const { outerSpaceCapacity = 0, craft = Craft.OuterSpace, op = Operator.AreAbove } = alertParams;

  // store defaults
  useEffect(() => {
    if (outerSpaceCapacity !== alertParams.outerSpaceCapacity) {
      setAlertParams('outerSpaceCapacity', outerSpaceCapacity);
    }
    if (craft !== alertParams.craft) {
      setAlertParams('craft', craft);
    }
    if (op !== alertParams.op) {
      setAlertParams('op', op);
    }
  }, [alertParams, craft, op, outerSpaceCapacity, setAlertParams]);

  const [craftTrigger, setCraftTrigger] = useState<{ craft: string; isOpen: boolean }>({
    craft,
    isOpen: false,
  });
  const [outerSpaceCapacityTrigger, setOuterSpaceCapacity] = useState<{
    outerSpaceCapacity: number;
    op: string;
    isOpen: boolean;
  }>({
    outerSpaceCapacity,
    op,
    isOpen: false,
  });

  const errorsCallout = flatten(
    Object.entries(errors).map(([field, errs]: [string, string[]]) =>
      errs.map((e) => (
        <p>
          <EuiTextColor color="accent">{field}:</EuiTextColor>`: ${errs}`
        </p>
      ))
    )
  );

  return (
    <Fragment>
      {errorsCallout.length ? (
        <EuiCallOut title="Sorry, there was an error" color="danger" iconType="alert">
          {errorsCallout}
        </EuiCallOut>
      ) : (
        <Fragment />
      )}
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiPopover
            id="craft"
            button={
              <EuiExpression
                description="When the People in"
                value={craftTrigger.craft}
                isActive={craftTrigger.isOpen}
                onClick={() => {
                  setCraftTrigger({
                    ...craftTrigger,
                    isOpen: true,
                  });
                }}
              />
            }
            isOpen={craftTrigger.isOpen}
            closePopover={() => {
              setCraftTrigger({
                ...craftTrigger,
                isOpen: false,
              });
            }}
            ownFocus
            panelPaddingSize="s"
            anchorPosition="downLeft"
          >
            <div style={{ zIndex: 200 }}>
              <EuiPopoverTitle>When the People in</EuiPopoverTitle>
              <EuiSelect
                compressed
                value={craftTrigger.craft}
                onChange={(event) => {
                  setAlertParams('craft', event.target.value);
                  setCraftTrigger({
                    craft: event.target.value,
                    isOpen: false,
                  });
                }}
                options={[
                  { value: Craft.OuterSpace, text: 'Outer Space' },
                  { value: Craft.ISS, text: 'the International Space Station' },
                ]}
              />
            </div>
          </EuiPopover>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiPopover
            id="outerSpaceCapacity"
            button={
              <EuiExpression
                description={outerSpaceCapacityTrigger.op}
                value={outerSpaceCapacityTrigger.outerSpaceCapacity}
                isActive={outerSpaceCapacityTrigger.isOpen}
                onClick={() => {
                  setOuterSpaceCapacity({
                    ...outerSpaceCapacityTrigger,
                    isOpen: true,
                  });
                }}
              />
            }
            isOpen={outerSpaceCapacityTrigger.isOpen}
            closePopover={() => {
              setOuterSpaceCapacity({
                ...outerSpaceCapacityTrigger,
                isOpen: false,
              });
            }}
            ownFocus
            panelPaddingSize="s"
            anchorPosition="downLeft"
          >
            <div style={{ zIndex: 200 }}>
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem grow={false} style={{ width: 150 }}>
                  <EuiSelect
                    compressed
                    value={outerSpaceCapacityTrigger.op}
                    onChange={(event) => {
                      setAlertParams('op', event.target.value);
                      setOuterSpaceCapacity({
                        ...outerSpaceCapacityTrigger,
                        op: event.target.value,
                        isOpen: false,
                      });
                    }}
                    options={[
                      { value: Operator.AreAbove, text: 'Are above' },
                      { value: Operator.AreBelow, text: 'Are below' },
                      { value: Operator.AreExactly, text: 'Are exactly' },
                    ]}
                  />
                </EuiFlexItem>

                <EuiFlexItem grow={false} style={{ width: 100 }}>
                  <EuiFieldNumber
                    compressed
                    value={outerSpaceCapacityTrigger.outerSpaceCapacity}
                    onChange={(event) => {
                      setAlertParams('outerSpaceCapacity', event.target.valueAsNumber);
                      setOuterSpaceCapacity({
                        ...outerSpaceCapacityTrigger,
                        outerSpaceCapacity: event.target.valueAsNumber,
                        isOpen: false,
                      });
                    }}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </div>
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
    </Fragment>
  );
};
