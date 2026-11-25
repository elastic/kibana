/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RefObject } from 'react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiProgress, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CPSProject } from '../../../../types';
import { ProjectPickerListItem, type ProjectPickerListItemProps } from './list_item';
import { useProjectPickerActions, useProjectPickerState } from '../../state';
import { getIncludedVisibleProjectIds } from '../../state/derivatives';
import { projectPickerListStyles } from './list.styles';
import { getProjectTags } from '../../../utils';
import { ProjectPickerListItemTagsPopover } from './list_item_tags_popover/list_item_tags_popover';
import { ProjectPickerListItemContextMenu } from './list_item_context_menu/list_item_context_menu';

type ActivePopover =
  | { kind: 'contextMenu'; project: CPSProject; isVisible: boolean }
  | { kind: 'tags'; project: CPSProject; isVisible: boolean }
  | null;

export interface ProjectPickerListProps {
  /**
   * Ref to the scrollable ancestor that clips the list, if any. When the list is scrolled
   * within this container, any open popover is closed rather than left floating disconnected
   * from its anchor button.
   */
  scrollContainerRef?: RefObject<HTMLElement>;
  showProjectTags?: boolean;
}

export function ProjectPickerList({
  scrollContainerRef,
  showProjectTags = true,
}: ProjectPickerListProps) {
  const buttonRef = useRef<HTMLElement | null>(null);
  const [activePopover, setActivePopover] = useState<ActivePopover>(null);
  const actions = useProjectPickerActions();
  const state = useProjectPickerState();
  const { euiTheme } = useEuiTheme();
  const styles = projectPickerListStyles({ euiTheme });

  const includedVisibleProjectIds = useMemo(() => getIncludedVisibleProjectIds(state), [state]);

  const selectedProjectIdsSet = useMemo(
    () => new Set(state.selectedProjectIds),
    [state.selectedProjectIds]
  );

  const projectsToRender = useMemo(() => {
    // when controls are hidden, we want to show only the selected projects
    return (state.controlsState === 'hidden' ? state.selectedProjectIds : state.visibleProjectIds)
      .map((id) => state.availableProjects.get(id))
      .filter((project): project is CPSProject => project != null);
  }, [
    state.controlsState,
    state.selectedProjectIds,
    state.visibleProjectIds,
    state.availableProjects,
  ]);

  const closePopover = useCallback(() => {
    buttonRef.current = null;
    setActivePopover(null);
  }, []);

  const getWrappingPopoverTrigger = useCallback((kind: 'contextMenu' | 'tags') => {
    return (project: CPSProject, evt: React.MouseEvent<unknown>) => {
      evt.preventDefault();

      const nextButton = evt.currentTarget as HTMLElement;

      setActivePopover((prev) => {
        if (prev?.kind === kind && prev.project._id === project._id) {
          buttonRef.current = null;
          return null;
        }

        buttonRef.current = nextButton;
        return { kind, project, isVisible: true };
      });
    };
  }, []);

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

  useEffect(() => {
    const scrollContainer = scrollContainerRef?.current;
    const anchorButton = buttonRef.current;

    if (!activePopover || !scrollContainer || !anchorButton) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setActivePopover((prev) => (prev ? { ...prev, isVisible: entry.isIntersecting } : prev));
      },
      { root: scrollContainer, threshold: 0 }
    );

    observer.observe(anchorButton);

    return () => {
      observer.disconnect();
    };
  }, [activePopover, scrollContainerRef]);

  const activeProject = activePopover?.project ?? null;

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      {activePopover?.kind === 'contextMenu' && activeProject && buttonRef.current ? (
        <ProjectPickerListItemContextMenu
          key={`contextMenu-${activeProject._id}`}
          button={buttonRef.current}
          isOpen={activePopover?.isVisible ?? false}
          activeProject={activeProject}
          closeHandler={closePopover}
        />
      ) : null}
      {showProjectTags && activePopover?.kind === 'tags' && activeProject && buttonRef.current ? (
        <ProjectPickerListItemTagsPopover
          key={`tags-${activeProject._id}`}
          button={buttonRef.current}
          isOpen={activePopover?.isVisible ?? false}
          closeHandler={closePopover}
          projectTags={getProjectTags(activeProject)}
        />
      ) : null}
      {state.isFilterProposalPending && (
        <EuiFlexItem grow={false}>
          <EuiProgress
            size="xs"
            color="primary"
            data-test-subj="projectPickerListLoadingIndicator"
          />
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        <EuiFlexGroup direction="column" gutterSize="none" data-test-subj="projectPickerList">
          {projectsToRender.map((project) => {
            const isSelected = selectedProjectIdsSet.has(project._id);

            return (
              <EuiFlexItem key={project._id} grow={false} css={styles.listItemContainer}>
                <ProjectPickerListItem
                  isSelected={isSelected}
                  isToggleDisabled={isSelected && includedVisibleProjectIds.length === 1}
                  isInteractionsDisabled={state.isFilterProposalPending}
                  controlsState={state.controlsState}
                  isOriginProject={state.originProjectId === project._id}
                  showProjectTags={showProjectTags}
                  toggleDisabledMessage={toggleDisabledMessage}
                  project={project}
                  onContextMenu={onContextMenu}
                  onToggle={onToggle}
                  onLabelClick={onLabelClick}
                />
              </EuiFlexItem>
            );
          })}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
