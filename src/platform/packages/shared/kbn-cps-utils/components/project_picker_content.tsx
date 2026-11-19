/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ComponentProps } from 'react';
import React, { useMemo, useRef, useCallback } from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import type { UseEuiTheme } from '@elastic/eui';
import { EuiFlexItem, EuiFlexGroup, EuiLoadingSpinner } from '@elastic/eui';
import { css } from '@emotion/react';
import type { ProjectRouting } from '@kbn/es-query';
import { PROJECT_ROUTING } from '@kbn/cps-common';
import {
  ProjectPickerStateProvider,
  type ProjectPickerStateProviderProps,
} from './project_picker_update/state';
import { ProjectPickerFrame } from './project_picker_update/blocks/frame';
import { ProjectPickerList } from './project_picker_update/blocks/list';
import type { ProjectsData } from '../types';
import { useFetchProjects } from './use_fetch_projects';

interface ProjectPickerContentBaseProps
  extends Pick<ProjectPickerStateProviderProps, 'projectRoutingStrategy'>,
    Pick<ComponentProps<typeof ProjectPickerFrame>, 'showHeader'> {
  projectRouting?: ProjectRouting;
  /**
   * Fetches projects matching a filter-only routing expression.
   */
  fetchProjectsByRouting: (projectRouting?: ProjectRouting) => Promise<ProjectsData | null>;
  maxListHeight?: number;
  customHeaderText?: React.ReactNode;
  /** Whether to show each project's custom tag count badge. Defaults to true. */
  showProjectTags?: boolean;
}

interface ProjectPickerContentEnabledProps extends ProjectPickerContentBaseProps {
  controlsState?: 'enabled';
  onProjectRoutingChange: (projectRouting: ProjectRouting) => void;
}

interface ProjectPickerContentReadOnlyProps extends ProjectPickerContentBaseProps {
  /**
   * Controls the project routing toggle (`All projects` / `This project`):
   * - `disabled`: shown but not interactive
   * - `hidden`: not rendered, leaving a read-only project list
   */
  controlsState: Exclude<NonNullable<ProjectPickerStateProviderProps['controlsState']>, 'enabled'>;
  onProjectRoutingChange?: (projectRouting: ProjectRouting) => void;
}

export type ProjectPickerContentProps =
  | ProjectPickerContentEnabledProps
  | ProjectPickerContentReadOnlyProps;

export const ProjectPickerContent = ({
  maxListHeight = 500,
  projectRouting = PROJECT_ROUTING.ORIGIN,
  onProjectRoutingChange,
  fetchProjectsByRouting,
  controlsState = 'enabled',
  customHeaderText,
  projectRoutingStrategy,
  showHeader,
  showProjectTags = true,
}: ProjectPickerContentProps) => {
  const styles = useMemoCss(projectPickerContentStyles);
  const initialProjectRouting = useRef(projectRouting);
  const currentProjectRouting = useRef(projectRouting);
  currentProjectRouting.current = projectRouting;

  const projects = useFetchProjects(fetchProjectsByRouting, PROJECT_ROUTING.ALL);

  const { originProject, linkedProjects, isLoading } = projects;

  const availableProjects = useMemo(
    () => (originProject ? [originProject, ...linkedProjects] : linkedProjects),
    [originProject, linkedProjects]
  );

  const defaultProjectRoutingGetter = useCallback(() => initialProjectRouting.current, []);
  const currentProjectRoutingGetter = useCallback(() => currentProjectRouting.current, []);

  return (
    <EuiFlexGroup gutterSize="none" direction="column" responsive={false} css={styles.container}>
      <EuiFlexItem>
        {isLoading ? (
          <div css={styles.loadingOverlay}>
            <EuiLoadingSpinner size="m" />
          </div>
        ) : (
          <ProjectPickerStateProvider
            onProjectRoutingChange={onProjectRoutingChange ?? (() => {})}
            originProjectId={originProject?._id}
            availableProjects={availableProjects}
            currentProjectRoutingGetter={currentProjectRoutingGetter}
            defaultProjectRoutingGetter={defaultProjectRoutingGetter}
            fetchProjectsByRouting={fetchProjectsByRouting}
            controlsState={controlsState}
            projectRoutingStrategy={projectRoutingStrategy}
          >
            <ProjectPickerFrame
              maxBodyHeight={maxListHeight}
              customHeaderText={customHeaderText}
              showHeader={showHeader}
            >
              <ProjectPickerList showProjectTags={showProjectTags} />
            </ProjectPickerFrame>
          </ProjectPickerStateProvider>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const projectPickerContentStyles = {
  errorCallout: ({ euiTheme }: UseEuiTheme) =>
    css({
      margin: euiTheme.size.m,
    }),
  container: ({ euiTheme }: UseEuiTheme) =>
    css({
      maxHeight: euiTheme.base * 25,
      overflow: 'hidden',
    }),
  buttonGroup: ({ euiTheme }: UseEuiTheme) =>
    css({
      margin: euiTheme.size.m,
    }),
  projectCountHeader: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
      borderBottom: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued}`,
    }),
  projectCountTitle: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: euiTheme.size.s,
    }),
  listContainer: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
      position: 'relative',
    }),
  loadingOverlay: ({ euiTheme }: UseEuiTheme) =>
    css({
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1,
      '&::before': {
        content: '""',
        position: 'absolute',
        inset: 0,
        backgroundColor: euiTheme.colors.backgroundBaseSubdued,
        opacity: 0.8,
        borderRadius: euiTheme.border.radius.small,
      },
    }),
};
