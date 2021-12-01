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
  EuiScreenReaderOnly,
  EuiSpacer,
  EuiIconTip,
} from '@elastic/eui';
import classnames from 'classnames';

import { ProjectID, EnvironmentName, Project, environmentNames } from '../../../common/labs';
import { EnvironmentSwitch } from './environment_switch';

import { LabsStrings } from '../../i18n';
const { ListItem: strings } = LabsStrings.Components;

import './project_list_item.scss';

export interface Props {
  project: Project;
  onStatusChange: (id: ProjectID, env: EnvironmentName, enabled: boolean) => void;
}

export const ProjectListItem = ({ project, onStatusChange }: Props) => {
  const { id, status, isActive, name, description, solutions } = project;
  const { isEnabled, isOverride } = status;

  return (
    <EuiFlexItem
      className={classnames({
        projectListItem: true,
        'projectListItem--isOverridden': isOverride,
        'projectListItem--isOverriddenEnabled': isOverride && isEnabled,
      })}
    >
      <EuiFlexGroup gutterSize="m" responsive={false}>
        <EuiFlexItem>
          <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiTitle className="projectListItem__title" size="xs">
                <h2>
                  {name}
                  {isOverride ? (
                    <span className="projectListItem__titlePendingChangesIndicator">
                      <EuiIconTip
                        content={strings.getOverriddenIconTipLabel()}
                        position="top"
                        type="dot"
                        color="success"
                      />
                    </span>
                  ) : null}
                </h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <div className="projectListItem__solutions">
                {solutions.map((solution) => (
                  <EuiBadge key={solution}>{solution}</EuiBadge>
                ))}
              </div>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiSpacer size="s" />
              <EuiText size="s" color="subdued">
                {description}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiSpacer size="xs" />
              <EuiText size="xs" color="subdued">
                {isActive ? strings.getEnabledStatusMessage() : strings.getDisabledStatusMessage()}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormFieldset
            legend={{
              children: (
                <>
                  <EuiScreenReaderOnly>
                    <span>{name}</span>
                  </EuiScreenReaderOnly>
                  {strings.getOverrideLegend()}
                </>
              ),
            }}
          >
            {environmentNames.map((env) => {
              const envStatus = status[env];
              if (envStatus !== undefined) {
                return (
                  <EnvironmentSwitch
                    key={env}
                    isChecked={envStatus}
                    onChange={(checked) => onStatusChange(id, env, checked)}
                    {...{ env, name }}
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
