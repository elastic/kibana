/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiTitle,
  EuiText,
  EuiFormFieldset,
} from '@elastic/eui';
import classnames from 'classnames';

import {
  ExperimentID,
  ExperimentEnvironment,
  Experiment,
  environmentNames,
} from '../../../common/experiments';
import { EnvironmentSwitch } from './environment_switch';

import { ExperimentsStrings } from '../../i18n';
const { ListItem: strings } = ExperimentsStrings.Components;

import './experiment_list_item.scss';

export interface Props {
  experiment: Experiment;
  onStatusChange: (id: ExperimentID, env: ExperimentEnvironment, enabled: boolean) => void;
}

export const ExperimentListItem = ({ experiment, onStatusChange }: Props) => {
  const { id, status, isActive, name, description, solutions } = experiment;
  const { isEnabled, isOverride } = status;

  return (
    <EuiFlexItem
      className={classnames({
        experimentListItem: true,
        'experimentListItem--isOverridden': isOverride,
        'experimentListItem--isOverriddenEnabled': isOverride && isEnabled,
      })}
    >
      <EuiFlexGroup gutterSize="m" responsive={false}>
        <EuiFlexItem>
          <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiTitle className="experimentListItem__title" size="s">
                <h2>{name}</h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <div className="experimentListItem__solutions">
                {solutions.map((solution) => (
                  <EuiBadge key={solution}>{solution}</EuiBadge>
                ))}
              </div>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s">{description}</EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s" color="subdued">
                {isActive ? strings.getEnabledStatusMessage() : strings.getDisabledStatusMessage()}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormFieldset legend={{ children: 'Override flags' }}>
            {environmentNames.map((env) => {
              const envStatus = status[env];
              if (envStatus !== undefined) {
                return (
                  <EnvironmentSwitch
                    key={env}
                    isChecked={envStatus}
                    env={env}
                    onChange={(checked) => onStatusChange(id, env, checked)}
                  />
                );
              }
            })}
          </EuiFormFieldset>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
