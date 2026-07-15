/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiWrappingPopover,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CPSProject } from '../../../../types';
import { ProjectPickerListItem, type ProjectPickerListItemProps } from './list_item';
import { useProjectPickerActions, useProjectPickerState } from '../../state';
import { projectPickerListStyles } from './list.styles';

export interface ProjectPickerListProps {
  projects: CPSProject[];
}

const getProjectPickerListContextMenuConfig = (
  actions: ReturnType<typeof useProjectPickerActions>
) => {
  return [
    {
      label: i18n.translate('cpsUtils.projectPicker.list.contextMenu.includeAllVisibleProjects', {
        defaultMessage: 'Include all other visible projects',
      }),
      onClick: actions.includeAllVisibleProjects.bind(actions),
    },
    {
      label: i18n.translate('cpsUtils.projectPicker.list.contextMenu.excludeAllVisibleProjects', {
        defaultMessage: 'Exclude all other visible projects',
      }),
      onClick: actions.excludeAllVisibleProjects.bind(actions),
    },
  ];
};

export function ProjectPickerList() {
  const projectContextMenuButtonRef = useRef<HTMLElement | null>(null);
  const [activeProject, setActiveProject] = useState<CPSProject | null>(null);
  const actions = useProjectPickerActions();
  const state = useProjectPickerState();
  const { euiTheme } = useEuiTheme();
  const styles = projectPickerListStyles({ euiTheme });

  const projectPickerListContextMenuConfig = useMemo(() => {
    return getProjectPickerListContextMenuConfig(actions);
  }, [actions]);

  const onContextMenu = useCallback<ProjectPickerListItemProps['onContextMenu']>(
    (project, evt) => {
      evt.preventDefault();

      if (activeProject?._id === project._id) {
        setActiveProject(null);
        projectContextMenuButtonRef.current = null;
        return;
      }

      projectContextMenuButtonRef.current = evt.currentTarget;
      setActiveProject(project);
    },
    [activeProject, setActiveProject, projectContextMenuButtonRef]
  );

  const onToggle = (project: CPSProject, checked: boolean) => {
    if (checked) {
      actions.setSelectedProjects({ projects: [project._id] });
    } else {
      actions.excludeSelectedProjects({
        projects: [project._id],
      });
    }
  };

  return (
    <>
      {activeProject ? (
        <EuiWrappingPopover
          button={projectContextMenuButtonRef.current!}
          isOpen={activeProject !== null}
          panelPaddingSize="none"
          anchorPosition="downLeft"
          aria-label={i18n.translate('cpsUtils.projectPicker.list.contextMenu.ariaLabel', {
            defaultMessage: 'Project context menu',
          })}
          closePopover={() => setActiveProject(null)}
        >
          <EuiContextMenuPanel
            items={projectPickerListContextMenuConfig.map((item) => (
              <EuiContextMenuItem key={item.label} onClick={item.onClick}>
                {item.label}
              </EuiContextMenuItem>
            ))}
          />
        </EuiWrappingPopover>
      ) : null}
      <EuiFlexGroup direction="column" gutterSize="none">
        {Array.from(state.availableProjects.values()).map((project) => (
          <EuiFlexItem key={project._id} css={styles.listItemContainer}>
            <ProjectPickerListItem
              isSelected={state.selectedProjects.includes(project._id)}
              project={project}
              onContextMenu={onContextMenu}
              onToggle={onToggle}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </>
  );
}
