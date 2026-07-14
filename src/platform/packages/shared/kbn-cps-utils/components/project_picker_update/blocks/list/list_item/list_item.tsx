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
  EuiIcon,
  EuiSwitch,
  EuiText,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CPSProject } from '../../../../../types';

export interface ProjectPickerListItemProps {
  isSelected: boolean;
  isToggleDisabled?: boolean;
  toggleDisabledMessage: string;
  project: CPSProject;
  onContextMenu: (project: CPSProject, evt: React.MouseEvent<HTMLAnchorElement>) => void;
  onToggle: (project: CPSProject, checked: boolean) => void;
}

export function ProjectPickerListItem({
  isSelected,
  isToggleDisabled = false,
  toggleDisabledMessage,
  project,
  onContextMenu,
  onToggle,
}: ProjectPickerListItemProps) {
  const contextMenuTooltipId = useGeneratedHtmlId();
  const toggleTooltipId = useGeneratedHtmlId();

  const switchControl = (
    <EuiSwitch
      checked={isSelected}
      disabled={isToggleDisabled}
      onChange={(evt) => onToggle(project, evt.target.checked)}
      label={null}
      data-test-subj={`projectPickerListItemSwitch-${project._id}`}
    />
  );

  return (
    <EuiFlexGroup data-test-subj="projectPickerListItem" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon
          type={`logo${project._type.replace(/^[a-z]/i, (char) => char.toUpperCase())}`}
          aria-hidden={true}
          data-test-subj="projectPickerListItemIcon"
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem>
            <EuiText size="s">
              <p>{project._alias}</p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="xs" color="subdued">
              {i18n.translate('cpsUtils.projectPicker.listItem.region', {
                defaultMessage: '{provider}, {region}',
                values: {
                  provider: project._provider,
                  region: project._region,
                },
              })}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup responsive={false}>
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
                onClick={onContextMenu.bind(null, project)}
                aria-labelledby={contextMenuTooltipId}
                data-test-subj={`projectPickerListItemContextMenu-${project._id}`}
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
