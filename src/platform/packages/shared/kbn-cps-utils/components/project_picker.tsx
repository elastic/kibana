/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, type ComponentProps, useMemo, useEffect } from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import type { UseEuiTheme } from '@elastic/eui';
import { EuiPopover, EuiTourStep, EuiButton, EuiSkeletonRectangle } from '@elastic/eui';
import { css } from '@emotion/react';
import {
  type Observable,
  of,
  concat,
  map,
  catchError,
  BehaviorSubject,
  switchMap,
  distinctUntilChanged,
  EMPTY,
} from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import { useProjectPickerTour } from './use_project_picker_tour';
import { strings } from './strings';
import {
  ProjectPickerButton,
  ProjectPickerFrame,
  ProjectPickerList,
} from './project_picker_update/blocks';
import { ProjectPickerStateProvider } from './project_picker_update/state';
import type { CPSProject, ProjectsData } from '../types';

export interface ProjectPickerProps
  extends Pick<
      ComponentProps<typeof ProjectPickerStateProvider>,
      'defaultProjectRoutingGetter' | 'onProjectRoutingChange' | 'currentProjectRoutingGetter'
    >,
    Pick<ComponentProps<typeof ProjectPickerFrame>, 'customHeaderContextMenuItems'> {
  getActiveRouteProjects$: () => Observable<ProjectsData | null>;
  isReadonly?: boolean;
  isDisabled?: boolean;
  settingsComponent?: React.ReactNode;
  totalProjectCount: number;
}

export const ProjectPicker = ({
  onProjectRoutingChange,
  isReadonly = false,
  isDisabled = false,
  getActiveRouteProjects$,
  defaultProjectRoutingGetter,
  currentProjectRoutingGetter,
  totalProjectCount,
  customHeaderContextMenuItems,
}: ProjectPickerProps) => {
  const [showPopover, setShowPopover] = useState(false);
  const styles = useMemoCss(projectPickerStyles);
  const { isTourOpen, closeTour } = useProjectPickerTour();

  const [isEnabled$] = useState(() => new BehaviorSubject(!isDisabled));

  useEffect(() => {
    isEnabled$.next(!isDisabled);
  }, [isDisabled, isEnabled$]);

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
            getActiveRouteProjects$().pipe(
              map((data) => ({ isLoading: false, data })),
              catchError(() => of({ isLoading: false, data: null }))
            )
          );
        })
      ),
    [isEnabled$, getActiveRouteProjects$]
  );

  const { isLoading, data: projects } = useObservable(projectsState$, {
    isLoading: true,
    data: null,
  });

  const availableProjects = useMemo((): CPSProject[] | undefined => {
    if (totalProjectCount <= 1 || !projects?.origin) {
      return undefined;
    }

    return [
      projects?.origin,
      ...projects.linkedProjects.slice(0).sort((a, b) => a._alias.localeCompare(b._alias)),
    ];
  }, [projects?.origin, projects?.linkedProjects, totalProjectCount]);

  if (isDisabled) {
    return (
      <ProjectPickerButton
        // @ts-expect-error - EuiButtonProps xs size is supported, types just say otherwise
        size="xs"
        onClick={() => {}}
        isDisabled
      />
    );
  }

  if (isLoading) {
    return <ProjectPickerSkeleton />;
  }

  if (!availableProjects) {
    return null;
  }

  const originProject = projects!.origin!;

  const projectPickerPopoverTriggerButton = (
    <ProjectPickerButton
      // @ts-expect-error - EuiButtonProps xs size is supported, types just say otherwise
      size="xs"
      onClick={() => setShowPopover(!showPopover)}
    />
  );

  const projectPickerPopover = (
    <ProjectPickerStateProvider
      currentProjectRoutingGetter={currentProjectRoutingGetter}
      defaultProjectRoutingGetter={defaultProjectRoutingGetter}
      originProjectId={originProject._id}
      availableProjects={availableProjects}
      onProjectRoutingChange={onProjectRoutingChange}
      isReadOnly={isReadonly}
    >
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
        <ProjectPickerFrame customHeaderContextMenuItems={customHeaderContextMenuItems}>
          <ProjectPickerList />
        </ProjectPickerFrame>
      </EuiPopover>
    </ProjectPickerStateProvider>
  );

  return (
    <EuiTourStep
      isStepOpen={isTourOpen}
      title={strings.getProjectPickerTourTitle()}
      content={strings.getProjectPickerTourContent()}
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
      // @ts-expect-error - EuiButtonProps xs size is supported, types just say otherwise
      size="xs"
      totalProjectsCount={totalProjectCount}
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
