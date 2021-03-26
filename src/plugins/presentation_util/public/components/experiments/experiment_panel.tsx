/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiFlexGroup, EuiPanel, EuiFlexItem, EuiBadge, EuiTitle, EuiText } from '@elastic/eui';
import classnames from 'classnames';

import {
  ExperimentID,
  ExperimentEnvironment,
  Experiment,
  environmentNames,
} from '../../../common/experiments';
import { EnvironmentSwitch } from './environment_switch';
import { ExperimentBadge } from './experiment_badge';

import './experiment_panel.scss';

export interface Props {
  experiment: Experiment;
  onStatusChange: (id: ExperimentID, env: ExperimentEnvironment, enabled: boolean) => void;
}

export const ExperimentPanel = ({ experiment, onStatusChange }: Props) => {
  const { id, status, isActive, name, description, solutions } = experiment;
  const { isEnabled, isOverride } = status;

  return (
    <EuiPanel
      className={classnames({
        experimentListItem: true,
        'experimentListItem--isOverridden': isOverride,
        'experimentListItem--isOverriddenEnabled': isOverride && isEnabled,
      })}
    >
      <EuiFlexGroup gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" direction="column">
            <ExperimentBadge {...{ isEnabled, isActive }} />
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup direction="column" gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiTitle className="experimentListItem__title" size="s">
                <h2>{name}</h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <div style={{ marginTop: -2 }}>
                {solutions.map((solution) => (
                  <EuiBadge key={solution}>{solution}</EuiBadge>
                ))}
              </div>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s">{description}</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="column" gutterSize="s">
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
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
