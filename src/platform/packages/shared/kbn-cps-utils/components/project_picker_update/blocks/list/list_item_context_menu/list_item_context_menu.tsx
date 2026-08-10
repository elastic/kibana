/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import type { EuiContextMenuItemProps } from '@elastic/eui';
import {
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiWrappingPopover,
  type EuiWrappingPopoverProps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CPSProject } from '../../../../../types';
import { useProjectPickerActions, useProjectPickerState } from '../../../state';
import { computeVisibleProjectIds } from '../../../state/derivatives';

interface ProjectPickerListClickActionContext {
  activeProject: CPSProject;
  state: ReturnType<typeof useProjectPickerState>;
}

interface ProjectPickerListContextMenuItemProps
  extends Pick<EuiContextMenuItemProps, 'icon' | 'external'> {
  label: string;
  onClick: (props: Pick<ProjectPickerListClickActionContext, 'activeProject'>) => void;
  isDisabled: (props: ProjectPickerListClickActionContext) => boolean;
}

interface ProjectPickerListItemContextMenuProps
  extends Pick<EuiWrappingPopoverProps, 'button' | 'isOpen'>,
    Pick<ProjectPickerListClickActionContext, 'activeProject'> {
  closeHandler: () => void;
}

export const getProjectPickerListContextMenuConfig = (
  actions: ReturnType<typeof useProjectPickerActions>
): Array<ProjectPickerListContextMenuItemProps> => {
  return [
    {
      label: i18n.translate('cpsUtils.projectPicker.list.contextMenu.excludeAllVisibleProjects', {
        defaultMessage: 'Include only this project',
      }),
      onClick: (props) => {
        actions.includeOnlyProvidedProjectId({ anchorProjectId: props.activeProject._id });
      },
      isDisabled: (props) => {
        const anchorProjectId = props.activeProject._id;
        const otherVisibleIds = computeVisibleProjectIds(props.state).filter(
          (id) => id !== anchorProjectId
        );

        return (
          !props.state.excludedOverrides.includes(anchorProjectId) &&
          otherVisibleIds.every((id) => props.state.excludedOverrides.includes(id))
        );
      },
    },
    {
      label: i18n.translate('cpsUtils.projectPicker.list.contextMenu.includeAllVisibleProjects', {
        defaultMessage: 'Exclude only this project',
      }),
      onClick: (props) => {
        actions.excludeOnlyProvidedProjectId({ anchorProjectId: props.activeProject._id });
      },
      isDisabled: (props) => {
        const anchorProjectId = props.activeProject._id;
        const otherVisibleIds = computeVisibleProjectIds(props.state).filter(
          (id) => id !== anchorProjectId
        );

        return (
          props.state.excludedOverrides.includes(anchorProjectId) &&
          otherVisibleIds.every((id) => !props.state.excludedOverrides.includes(id))
        );
      },
    },
  ];
};

export function ProjectPickerListItemContextMenu({
  isOpen,
  closeHandler,
  button,
  activeProject,
}: ProjectPickerListItemContextMenuProps) {
  const state = useProjectPickerState();
  const actions = useProjectPickerActions();

  const projectPickerListContextMenuConfig = useMemo(() => {
    return getProjectPickerListContextMenuConfig(actions);
  }, [actions]);

  return (
    <EuiWrappingPopover
      button={button}
      isOpen={isOpen}
      panelPaddingSize="none"
      anchorPosition="downLeft"
      aria-label={i18n.translate('cpsUtils.projectPicker.list.contextMenu.ariaLabel', {
        defaultMessage: 'Project context menu',
      })}
      closePopover={closeHandler}
    >
      <EuiContextMenuPanel
        items={projectPickerListContextMenuConfig.map((item) => (
          <EuiContextMenuItem
            key={item.label}
            onClick={item.onClick.bind(null, { activeProject })}
            disabled={item.isDisabled({
              activeProject,
              state,
            })}
          >
            {item.label}
          </EuiContextMenuItem>
        ))}
      />
    </EuiWrappingPopover>
  );
}
