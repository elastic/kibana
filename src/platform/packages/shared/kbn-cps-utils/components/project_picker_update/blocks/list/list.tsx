/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import type { EuiContextMenuItemProps } from '@elastic/eui';
import {
  EuiBadge,
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
import { getIncludedVisibleProjectIds } from '../../state/derivatives';
import { projectPickerListStyles } from './list.styles';
import { getProjectTags } from '../../../utils';

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

type ActivePopover =
  | { kind: 'contextMenu'; project: CPSProject }
  | { kind: 'tags'; project: CPSProject }
  | null;

export const getProjectPickerListContextMenuConfig = (
  actions: ReturnType<typeof useProjectPickerActions>
): Array<ProjectPickerListContextMenuItemProps> => {
  return [
    {
      label: i18n.translate('cpsUtils.projectPicker.list.contextMenu.includeAllVisibleProjects', {
        defaultMessage: 'Include all other visible projects',
      }),
      onClick: (props) => {
        actions.includeAllOtherVisibleProjects({ anchorProjectId: props.activeProject._id });
      },
      isDisabled: (props) => {
        return (
          props.state.excludedOverrides.length === 0 ||
          (props.state.excludedOverrides.length === 1 &&
            props.state.excludedOverrides.includes(props.activeProject._id))
        );
      },
    },
    {
      label: i18n.translate('cpsUtils.projectPicker.list.contextMenu.excludeAllVisibleProjects', {
        defaultMessage: 'Exclude all other visible projects',
      }),
      onClick: (props) => {
        actions.excludeAllOtherVisibleProjects({ anchorProjectId: props.activeProject._id });
      },
      isDisabled: (props) => {
        return (
          props.state.excludedOverrides.includes(props.activeProject._id) ||
          getIncludedVisibleProjectIds(props.state).length === 1
        );
      },
    },
  ];
};

export function ProjectPickerList() {
  const buttonRef = useRef<HTMLElement | null>(null);
  const [activePopover, setActivePopover] = useState<ActivePopover>(null);
  const actions = useProjectPickerActions();
  const state = useProjectPickerState();
  const { euiTheme } = useEuiTheme();
  const styles = projectPickerListStyles({ euiTheme });

  const includedVisibleProjectIds = useMemo(() => getIncludedVisibleProjectIds(state), [state]);

  const projectPickerListContextMenuConfig = useMemo(() => {
    return getProjectPickerListContextMenuConfig(actions);
  }, [actions]);

  const visibleProjects = useMemo(
    () =>
      state.visibleProjectIds
        .map((id) => state.availableProjects.get(id))
        .filter((project): project is CPSProject => project != null),
    [state.visibleProjectIds, state.availableProjects]
  );

  const closePopover = useCallback(() => {
    buttonRef.current = null;
    setActivePopover(null);
  }, []);

  const getWrappingPopoverTrigger = useCallback(
    (kind: 'contextMenu' | 'tags') => {
      return (project: CPSProject, evt: React.MouseEvent<unknown>) => {
        evt.preventDefault();

        if (activePopover?.kind === kind && activePopover.project._id === project._id) {
          closePopover();
          return;
        }

        buttonRef.current = evt.currentTarget as HTMLElement;
        setActivePopover({ kind, project });
      };
    },
    [activePopover, closePopover]
  );

  const onContextMenu = useMemo<ProjectPickerListItemProps['onContextMenu']>(
    () => getWrappingPopoverTrigger('contextMenu'),
    [getWrappingPopoverTrigger]
  );

  const onLabelClick = useMemo<ProjectPickerListItemProps['onLabelClick']>(
    () => getWrappingPopoverTrigger('tags'),
    [getWrappingPopoverTrigger]
  );

  const onToggle = useCallback(
    (project: CPSProject, checked: boolean) => {
      if (
        !checked &&
        includedVisibleProjectIds.length === 1 &&
        includedVisibleProjectIds[0] === project._id
      ) {
        return;
      }

      if (checked) {
        actions.undoProjectExclusion({ projects: [project._id] });
      } else {
        actions.excludeSelectedProjects({
          projects: [project._id],
        });
      }
    },
    [actions, includedVisibleProjectIds]
  );

  const toggleDisabledMessage = useMemo(() => {
    return i18n.translate('cpsUtils.projectPicker.listItem.lastIncludedProject', {
      defaultMessage: 'You must be searching a minimum of one project.',
    });
  }, []);

  const activeProject = activePopover?.project ?? null;

  return (
    <>
      {activePopover?.kind === 'contextMenu' && activeProject && buttonRef.current ? (
        <EuiWrappingPopover
          key={`contextMenu-${activeProject._id}`}
          button={buttonRef.current}
          isOpen={true}
          panelPaddingSize="none"
          anchorPosition="downLeft"
          aria-label={i18n.translate('cpsUtils.projectPicker.list.contextMenu.ariaLabel', {
            defaultMessage: 'Project context menu',
          })}
          closePopover={closePopover}
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
      ) : null}
      {activePopover?.kind === 'tags' && activeProject && buttonRef.current ? (
        <EuiWrappingPopover
          key={`tags-${activeProject._id}`}
          button={buttonRef.current}
          isOpen={true}
          css={styles.projectTagsBadgeContainer}
          panelPaddingSize="s"
          anchorPosition="downLeft"
          aria-label={i18n.translate('cpsUtils.projectPicker.list.projectTags.ariaLabel', {
            defaultMessage: 'Project tags',
          })}
          closePopover={closePopover}
        >
          <EuiFlexGroup direction="column" responsive={false} gutterSize="xs">
            {getProjectTags(activeProject).map((tag) => (
              <EuiFlexItem key={tag} grow={false}>
                <EuiBadge
                  css={styles.projectTagsBadge}
                  color="hollow"
                  iconType="plusCircle"
                  iconSide="right"
                  onClick={() => {
                    actions.addFilterExpression({ expression: `is:${tag}` });
                  }}
                  onClickAriaLabel={i18n.translate(
                    'cpsUtils.projectPicker.list.projectTags.addFilterAriaLabel',
                    {
                      defaultMessage: 'Add filter to project',
                    }
                  )}
                >
                  {tag}
                </EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiWrappingPopover>
      ) : null}
      <EuiFlexGroup direction="column" gutterSize="none" data-test-subj="projectPickerList">
        {visibleProjects.map((project) => (
          <EuiFlexItem key={project._id} css={styles.listItemContainer}>
            <ProjectPickerListItem
              isSelected={state.selectedProjects.includes(project._id)}
              isToggleDisabled={
                state.selectedProjects.includes(project._id) &&
                includedVisibleProjectIds.length === 1
              }
              toggleDisabledMessage={toggleDisabledMessage}
              project={project}
              onContextMenu={onContextMenu}
              onToggle={onToggle}
              onLabelClick={onLabelClick}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </>
  );
}
