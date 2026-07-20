/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import type { UseEuiTheme } from '@elastic/eui';
import { EuiPopover, EuiToolTip, EuiTourStep, EuiButton, EuiSkeletonRectangle } from '@elastic/eui';
import { css } from '@emotion/react';
import type { ProjectRouting } from '@kbn/es-query';
import type { UseFetchProjectsResult } from './use_fetch_projects';
import { useProjectPickerTour } from './use_project_picker_tour';
import { strings } from './strings';
import {
  ProjectPickerButton,
  ProjectPickerFrame,
  ProjectPickerList,
} from './project_picker_update/blocks';
import { ProjectPickerStateProvider } from './project_picker_update/state';
import type { CPSProject } from '../types';

export interface ProjectPickerProps {
  projectRouting?: ProjectRouting;
  onProjectRoutingChange: (projectRouting: ProjectRouting) => void;
  projects: UseFetchProjectsResult;
  totalProjectCount: number;
  isReadonly?: boolean;
  settingsComponent?: React.ReactNode;
}

export const ProjectPicker = ({
  projectRouting,
  onProjectRoutingChange,
  projects,
  totalProjectCount,
  isReadonly = false,
  settingsComponent,
}: ProjectPickerProps) => {
  const [showPopover, setShowPopover] = useState(false);
  const styles = useMemoCss(projectPickerStyles);
  const { isTourOpen, closeTour } = useProjectPickerTour();

  const { originProject, linkedProjects, isLoading, error } = projects;

  if (totalProjectCount <= 1 || (!isLoading && !originProject && !error)) {
    return null;
  }

  if (isLoading) {
    return <ProjectPickerSkeleton />;
  }

  const activeProjectsCount =
    error || !originProject ? totalProjectCount : linkedProjects.length + 1;

  const button = (
    <EuiToolTip
      content={strings.getProjectPickerButtonLabel(activeProjectsCount, totalProjectCount)}
      disableScreenReaderOutput
    >
      <ProjectPickerButton
        size="xs"
        filteredProjectsCount={0}
        totalProjectsCount={totalProjectCount}
        onClick={() => setShowPopover(!showPopover)}
        isDisabled={isReadonly}
      />
    </EuiToolTip>
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
      <ProjectPickerStateProvider
        originProjectId={originProject?._id}
        availableProjects={([] as CPSProject[]).concat(originProject, linkedProjects)}
      >
        <EuiPopover
          button={button}
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
          <ProjectPickerFrame>
            <ProjectPickerList />
          </ProjectPickerFrame>
        </EuiPopover>
      </ProjectPickerStateProvider>
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
  const styles = useMemoCss(projectPickerStyles);
  if (totalProjectCount <= 1) {
    return null;
  }

  return (
    <ProjectPickerButton
      size="s"
      filteredProjectsCount={0}
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
