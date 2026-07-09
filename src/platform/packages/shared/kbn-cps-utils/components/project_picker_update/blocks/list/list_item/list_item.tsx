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
  project: CPSProject;
  onContextMenu: (project: CPSProject, evt: React.MouseEvent<HTMLAnchorElement>) => void;
  onToggle: (project: CPSProject, checked: boolean) => void;
}

export function ProjectPickerListItem({
  isSelected,
  project,
  onContextMenu,
  onToggle,
}: ProjectPickerListItemProps) {
  const id = useGeneratedHtmlId();

  return (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiIcon
          type={`logo${project._type.replace(/^[a-z]/i, (char) => char.toUpperCase())}`}
          aria-hidden={true}
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
              {i18n.translate('kbn.cps.projectPickerListItem.region', {
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
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiSwitch
              showLabel={false}
              checked={isSelected}
              onChange={(evt) => onToggle(project, evt.target.checked)}
              label={null}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip
              id={id}
              content={i18n.translate('kbn.cps.projectPickerListItem.contextMenu', {
                defaultMessage: 'Show context menu',
              })}
            >
              <EuiButtonIcon
                iconType="ellipsis"
                onClick={onContextMenu.bind(null, project)}
                aria-labelledby={id}
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
