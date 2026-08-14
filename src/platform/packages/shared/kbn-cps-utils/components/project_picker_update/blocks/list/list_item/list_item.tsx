/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
  EuiText,
  EuiToolTip,
  EuiBadge,
  useGeneratedHtmlId,
  EuiIconTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import capitalize from 'lodash/capitalize';
import type { CPSProject } from '../../../../../types';
import { getProjectTags, getSolutionIcon } from '../../../../utils';

export interface ProjectPickerListItemProps {
  isReadOnly?: boolean;
  isSelected: boolean;
  isToggleDisabled?: boolean;
  toggleDisabledMessage: string;
  project: CPSProject;
  onContextMenu: (project: CPSProject, evt: React.MouseEvent<HTMLAnchorElement>) => void;
  onToggle: (project: CPSProject, checked: boolean) => void;
  onLabelClick: (project: CPSProject, evt: React.MouseEvent<HTMLButtonElement>) => void;
}

export function ProjectPickerListItem({
  isReadOnly,
  isSelected,
  isToggleDisabled = false,
  toggleDisabledMessage,
  project,
  onContextMenu,
  onToggle,
  onLabelClick,
}: ProjectPickerListItemProps) {
  const contextMenuTooltipId = useGeneratedHtmlId();
  const toggleTooltipId = useGeneratedHtmlId();

  const projectTags = getProjectTags(project);

  const switchControl = (
    <EuiSwitch
      checked={isSelected}
      disabled={isToggleDisabled || isReadOnly}
      onChange={(evt) => onToggle(project, evt.target.checked)}
      label={null}
      data-test-subj={`projectPickerListItemSwitch-${project._id}`}
      compressed
    />
  );

  return (
    <EuiFlexGroup data-test-subj="projectPickerListItem" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIconTip
          position="top"
          content={capitalize(project._type)}
          type={getSolutionIcon(project._type)}
          data-test-subj="projectPickerListItemIcon"
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem>
            <EuiFlexGroup responsive={false} gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <p>{project._alias}</p>
                </EuiText>
              </EuiFlexItem>
              {Boolean(projectTags.length) && (
                <EuiFlexItem grow={false}>
                  <EuiBadge
                    tabIndex={0}
                    iconType="tag"
                    data-test-subj="projectPickerListItemTags"
                    onClick={onLabelClick.bind(null, project)}
                    onClickAriaLabel={i18n.translate(
                      'cpsUtils.projectPicker.listItem.tagsClickAriaLabel',
                      {
                        defaultMessage: 'Click to view project tags',
                      }
                    )}
                  >
                    {projectTags.length}
                  </EuiBadge>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="xs" color="subdued">
              {i18n.translate('cpsUtils.projectPicker.listItem.region', {
                defaultMessage: '{provider}, {region}',
                values: {
                  provider: project._csp,
                  region: project._region,
                },
              })}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup responsive={false} alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            {isToggleDisabled ? (
              <EuiToolTip id={toggleTooltipId} content={toggleDisabledMessage}>
                {switchControl}
              </EuiToolTip>
            ) : (
              switchControl
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip
              id={contextMenuTooltipId}
              content={i18n.translate('cpsUtils.projectPicker.listItem.contextMenu', {
                defaultMessage: 'Show context menu',
              })}
            >
              <EuiButtonIcon
                iconType="ellipsis"
                isDisabled={isReadOnly}
                onClick={onContextMenu.bind(null, project)}
                aria-labelledby={contextMenuTooltipId}
                data-test-subj={`projectPickerListItemContextMenu-${project._id}`}
                color="text"
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
