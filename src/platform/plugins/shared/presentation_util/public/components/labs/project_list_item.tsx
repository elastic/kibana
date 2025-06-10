/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
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
  useEuiTheme,
} from '@elastic/eui';
import classnames from 'classnames';

import { ProjectID, EnvironmentName, Project, environmentNames } from '../../../common/labs';
import { EnvironmentSwitch } from './environment_switch';

import { LabsStrings } from '../../i18n';
const { ListItem: strings } = LabsStrings.Components;

export interface Props {
  project: Project;
  onStatusChange: (id: ProjectID, env: EnvironmentName, enabled: boolean) => void;
}

export const ProjectListItem = ({ project, onStatusChange }: Props) => {
  const { id, status, isActive, name, description, solutions } = project;
  const { isEnabled, isOverride } = status;
  const { projectListItemStyles, pendingChangesIndicatorStyles, solutionsStyles } = useStyles();

  return (
    <EuiFlexItem
      className={classnames({
        'projectListItem--isOverridden': isOverride,
        'projectListItem--isOverriddenEnabled': isOverride && isEnabled,
      })}
      css={projectListItemStyles}
    >
      <EuiFlexGroup gutterSize="m" responsive={false}>
        <EuiFlexItem>
          <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiTitle className="projectListItem__title" size="xs">
                <h2>
                  {name}
                  {isOverride ? (
                    <span css={pendingChangesIndicatorStyles}>
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
              <div css={solutionsStyles}>
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

const useStyles = () => {
  const { euiTheme } = useEuiTheme();
  const styles = useMemo(() => {
    return {
      projectListItemStyles: css({
        position: 'relative',
        '&.projectListItem--isOverridden:before': {
          position: 'absolute',
          top: euiTheme.size.m,
          left: euiTheme.size.xs,
          bottom: 0,
          width: euiTheme.size.xs,
          background: euiTheme.colors.success,
          content: '""',
        },
        '.euiSwitch__label': {
          width: '100%',
        },
        '.euiFlyout &': {
          '&.projectListItem--isOverridden:before': {
            left: `-${euiTheme.size.m}`,
          },
          '&.projectListItem--isOverridden:first-child:before': {
            top: 0,
          },
        },
      }),
      pendingChangesIndicatorStyles: css({
        marginLeft: euiTheme.size.s,
        position: 'relative',
        top: '-1px',
      }),
      solutionsStyles: css({
        textTransform: 'capitalize',
      }),
    };
  }, [euiTheme]);
  return styles;
};
