/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldNumber,
  EuiFormRow,
  EuiPopover,
  EuiExpression,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { omit, pick } from 'lodash';
import {
  ActionGroupWithCondition,
  AlertConditions,
  AlertConditionsGroup,
  AlertTypeParamsExpressionProps,
} from '../../../../x-pack/plugins/triggers_actions_ui/public';
import { ObservabilityRuleTypeModel } from '../../../../x-pack/plugins/observability/public';

import {
  AlwaysFiringParams,
  AlwaysFiringActionGroupIds,
  DEFAULT_INSTANCES_TO_GENERATE,
} from '../../common/constants';

export function createAlwaysFiringAlertType(): ObservabilityRuleTypeModel<AlwaysFiringParams> {
  return {
    id: 'example.always-firing-demo',
    description: 'Alert when called',
    iconClass: 'bell',
    documentationUrl: null,
    alertParamsExpression: AlwaysFiringExpression,
    validate: (alertParams: AlwaysFiringParams) => {
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
    defaultActionMessage: i18n.translate(
      'xpack.infra.metrics.alerting.threshold.defaultActionMessage',
      {
        defaultMessage: `\\{\\{alertName\\}\\} - \\{\\{context.group\\}\\} is in a state of \\{\\{context.alertState\\}\\}

Reason:
\\{\\{context.reason\\}\\}
`,
      }
    ),
    format: () => ({ reason: 'Some reason', link: 'some_link' }),
  };
}

const DEFAULT_THRESHOLDS: AlwaysFiringParams['thresholds'] = {
  small: 0,
  medium: 5000,
  large: 10000,
};

export const AlwaysFiringExpression: React.FunctionComponent<
  AlertTypeParamsExpressionProps<AlwaysFiringParams>
> = ({ alertParams, setAlertParams, actionGroups, defaultActionGroupId }) => {
  const {
    instances = DEFAULT_INSTANCES_TO_GENERATE,
    thresholds = pick(DEFAULT_THRESHOLDS, defaultActionGroupId),
  } = alertParams;

  const actionGroupsWithConditions = actionGroups.map((actionGroup) =>
    Number.isInteger(thresholds[actionGroup.id as AlwaysFiringActionGroupIds])
      ? {
          ...actionGroup,
          conditions: thresholds[actionGroup.id as AlwaysFiringActionGroupIds]!,
        }
      : actionGroup
  );

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
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem grow={true}>
          <AlertConditions
            headline={'Set different thresholds for randomly generated T-Shirt sizes'}
            actionGroups={actionGroupsWithConditions}
            onInitializeConditionsFor={(actionGroup) => {
              setAlertParams('thresholds', {
                ...thresholds,
                ...pick(DEFAULT_THRESHOLDS, actionGroup.id),
              });
            }}
          >
            <AlertConditionsGroup
              onResetConditionsFor={(actionGroup) => {
                setAlertParams('thresholds', omit(thresholds, actionGroup.id));
              }}
            >
              <TShirtSelector
                setTShirtThreshold={(actionGroup) => {
                  setAlertParams('thresholds', {
                    ...thresholds,
                    [actionGroup.id]: actionGroup.conditions,
                  });
                }}
              />
            </AlertConditionsGroup>
          </AlertConditions>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
    </Fragment>
  );
};

interface TShirtSelectorProps {
  actionGroup?: ActionGroupWithCondition<number, AlwaysFiringActionGroupIds>;
  setTShirtThreshold: (
    actionGroup: ActionGroupWithCondition<number, AlwaysFiringActionGroupIds>
  ) => void;
}
const TShirtSelector = ({ actionGroup, setTShirtThreshold }: TShirtSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!actionGroup) {
    return null;
  }

  return (
    <EuiPopover
      panelPaddingSize="s"
      button={
        <EuiExpression
          description={'Is Above'}
          value={actionGroup.conditions}
          isActive={isOpen}
          onClick={() => setIsOpen(true)}
        />
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      ownFocus
      anchorPosition="downLeft"
    >
      <EuiFlexGroup>
        <EuiFlexItem grow={false} style={{ width: 150 }}>
          {'Is Above'}
        </EuiFlexItem>
        <EuiFlexItem grow={false} style={{ width: 100 }}>
          <EuiFieldNumber
            compressed
            value={actionGroup.conditions}
            onChange={(e) => {
              const conditions = parseInt(e.target.value, 10);
              if (e.target.value && !isNaN(conditions)) {
                setTShirtThreshold({
                  ...actionGroup,
                  conditions,
                });
              }
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPopover>
  );
};
