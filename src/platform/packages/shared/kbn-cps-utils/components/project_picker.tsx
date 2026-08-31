/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, type ComponentProps, useMemo, useEffect, useCallback } from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import type { UseEuiTheme } from '@elastic/eui';
import { EuiPopover, EuiTourStep, EuiButton, EuiSkeletonRectangle } from '@elastic/eui';
import { css } from '@emotion/react';
import {
  of,
  concat,
  map,
  catchError,
  BehaviorSubject,
  switchMap,
  distinctUntilChanged,
  EMPTY,
  from,
} from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import { PROJECT_ROUTING } from '@kbn/cps-common';
import { useProjectPickerTour, TOUR_STORAGE_KEY } from './use_project_picker_tour';
import { strings } from './strings';
import {
  ProjectPickerButton,
  ProjectPickerFrame,
  ProjectPickerList,
} from './project_picker_update/blocks';
import { ProjectPickerStateProvider } from './project_picker_update/state';
import type { CPSProject, ProjectsData } from '../types';
import { useProjectPickerState } from './project_picker_update/state';

export { TOUR_STORAGE_KEY };
export interface ProjectPickerProps
  extends Pick<
      ComponentProps<typeof ProjectPickerStateProvider>,
      | 'defaultProjectRoutingGetter'
      | 'onProjectRoutingChange'
      | 'currentProjectRoutingGetter'
      | 'fetchProjectsByRouting'
      | 'projectRoutingStrategy'
    >,
    Pick<
      ComponentProps<typeof ProjectPickerFrame>,
      'customHeaderContextMenuItems' | 'maxBodyHeight'
    > {
  isReadonly?: boolean;
  isDisabled?: boolean;
  settingsComponent?: React.ReactNode;
  totalProjectCount: number;
}

function TourTitle() {
  const state = useProjectPickerState();

  const filteredProjectsCount = useMemo(
    () => state.selectedProjectIds.length,
    [state.selectedProjectIds]
  );
  const totalProjectsCount = useMemo(() => state.availableProjects.size, [state.availableProjects]);

  return strings.getProjectPickerTourTitle(filteredProjectsCount, totalProjectsCount);
}

function TourContent() {
  const state = useProjectPickerState();
  const totalProjectsCount = useMemo(() => state.availableProjects.size, [state.availableProjects]);

  return strings.getProjectPickerTourContent(totalProjectsCount - 1);
}

export const ProjectPicker = ({
  onProjectRoutingChange,
  isReadonly = false,
  isDisabled = false,
  defaultProjectRoutingGetter,
  currentProjectRoutingGetter,
  fetchProjectsByRouting,
  totalProjectCount,
  customHeaderContextMenuItems,
  projectRoutingStrategy,
  maxBodyHeight = 400,
}: ProjectPickerProps) => {
  const [showPopover, setShowPopover] = useState(false);
  const styles = useMemoCss(projectPickerStyles);
  const { isTourOpen, closeTour } = useProjectPickerTour();

  const [isEnabled$] = useState(() => new BehaviorSubject(!isDisabled));

  useEffect(() => {
    isEnabled$.next(!isDisabled);
  }, [isDisabled, isEnabled$]);

  const getAvailableProjects$ = useCallback(() => {
    return from(fetchProjectsByRouting(PROJECT_ROUTING.ALL) ?? Promise.resolve(null));
  }, [fetchProjectsByRouting]);

  const projectsState$ = useMemo(
    () =>
      isEnabled$.pipe(
        distinctUntilChanged(),
        switchMap((enabled) => {
          if (!enabled) {
            return EMPTY;
          }
          return concat(
            of({ isLoading: true, data: null as ProjectsData | null }),
            getAvailableProjects$().pipe(
              map((data) => ({ isLoading: false, data })),
              catchError(() => of({ isLoading: false, data: null }))
            )
          );
        })
      ),
    [isEnabled$, getAvailableProjects$]
  );

  const { isLoading, data: projects } = useObservable(projectsState$, {
    isLoading: true,
    data: null,
  });

  const availableProjects = useMemo((): CPSProject[] | undefined => {
    if (totalProjectCount <= 1 || !projects?.origin) {
      return undefined;
    }

    return [projects?.origin, ...projects.linkedProjects];
  }, [projects?.origin, projects?.linkedProjects, totalProjectCount]);

  if (isDisabled) {
    if (totalProjectCount <= 1) {
      return null;
    }

    return <ProjectPickerButton size="s" onClick={() => {}} isDisabled />;
  }

  if (isLoading) {
    return <ProjectPickerSkeleton />;
  }

  if (!availableProjects) {
    return null;
  }

  const originProject = projects!.origin!;

  const projectPickerPopoverTriggerButton = (
    <ProjectPickerButton size="s" onClick={() => setShowPopover(!showPopover)} />
  );

  const projectPickerPopover = (
    <EuiPopover
      button={projectPickerPopoverTriggerButton}
      isOpen={showPopover}
      closePopover={() => setShowPopover(false)}
      repositionOnScroll
      anchorPosition="downLeft"
      ownFocus
      panelPaddingSize="none"
      panelProps={{ css: styles.popover }}
      hasArrow
      aria-label={strings.getProjectPickerPopoverTitle()}
    >
      <ProjectPickerFrame
        customHeaderContextMenuItems={customHeaderContextMenuItems}
        maxBodyHeight={maxBodyHeight}
      >
        <ProjectPickerList />
      </ProjectPickerFrame>
    </EuiPopover>
  );

  return (
    <ProjectPickerStateProvider
      currentProjectRoutingGetter={currentProjectRoutingGetter}
      defaultProjectRoutingGetter={defaultProjectRoutingGetter}
      originProjectId={originProject._id}
      availableProjects={availableProjects}
      onProjectRoutingChange={onProjectRoutingChange}
      fetchProjectsByRouting={fetchProjectsByRouting}
      controlsState={isReadonly ? 'disabled' : 'enabled'}
      projectRoutingStrategy={projectRoutingStrategy}
    >
      <EuiTourStep
        isStepOpen={isTourOpen}
        title={<TourTitle />}
        content={<TourContent />}
        onFinish={closeTour}
        step={1}
        stepsTotal={1}
        anchorPosition="downLeft"
        minWidth={300}
        maxWidth={360}
        repositionOnScroll
        offset={2}
        footerAction={
          <EuiButton
            size="s"
            color="success"
            onClick={closeTour}
            data-test-subj="project-picker-tour-close-button"
          >
            {strings.getProjectPickerTourCloseButton()}
          </EuiButton>
        }
        panelProps={{
          'data-test-subj': 'project-picker-tour',
        }}
      >
        {projectPickerPopover}
      </EuiTourStep>
    </ProjectPickerStateProvider>
  );
};

export const ProjectPickerSkeleton = () => (
  <EuiSkeletonRectangle width={48} height={24} borderRadius="m" />
);

export const DisabledProjectPicker = ({
  totalProjectCount,
  customTooltipContent,
}: {
  totalProjectCount: number;
  customTooltipContent?: string;
}) => {
  if (totalProjectCount <= 1) {
    return null;
  }

  return (
    <ProjectPickerButton
      size="s"
      onClick={() => {}}
      customTooltipContent={customTooltipContent}
      isDisabled
    />
  );
};

const projectPickerStyles = {
  button: ({ euiTheme }: UseEuiTheme) =>
    css({
      color: euiTheme.colors.textSubdued,
    }),
  popover: ({ euiTheme }: UseEuiTheme) =>
    css({
      width: euiTheme.base * 35,
    }),
  disabledButton: ({ euiTheme }: UseEuiTheme) =>
    css({
      margin: euiTheme.size.s,
    }),
};
