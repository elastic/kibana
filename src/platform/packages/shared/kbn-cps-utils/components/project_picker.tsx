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
import {
  EuiPopover,
  EuiToolTip,
  EuiTourStep,
  EuiButton,
  EuiButtonIcon,
  EuiButtonEmpty,
  EuiPopoverTitle,
  EuiTitle,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { ProjectRouting } from '@kbn/es-query';
import type { ProjectsData } from '../types';
import { ProjectPickerContent } from './project_picker_content';
import { useFetchProjects } from './use_fetch_projects';
import { useProjectPickerTour } from './use_project_picker_tour';
import { strings } from './strings';
import { CPSIconDisabled } from './cps_icon';

export interface ProjectPickerProps {
  projectRouting?: ProjectRouting;
  onProjectRoutingChange: (projectRouting: ProjectRouting) => void;
  fetchProjects: (routing?: ProjectRouting) => Promise<ProjectsData | null>;
  totalProjectCount: number;
  isReadonly?: boolean;
  settingsComponent?: React.ReactNode;
}

export const ProjectPicker = ({
  projectRouting,
  onProjectRoutingChange,
  fetchProjects,
  totalProjectCount,
  isReadonly = false,
  settingsComponent,
}: ProjectPickerProps) => {
  const [showPopover, setShowPopover] = useState(false);
  const styles = useMemoCss(projectPickerStyles);
  const { isTourOpen, closeTour } = useProjectPickerTour();

  const { originProject, linkedProjects, isLoading, error } = useFetchProjects(
    fetchProjects,
    projectRouting
  );

  if (totalProjectCount <= 1 || (!isLoading && !originProject && !error)) {
    return null;
  }

  const activeProjectsCount =
    isLoading || error || !originProject ? totalProjectCount : linkedProjects.length + 1;

  const button = (
    <EuiToolTip
      delay="long"
      content={strings.getProjectPickerButtonLabel(activeProjectsCount, totalProjectCount)}
      disableScreenReaderOutput
    >
      <EuiButtonEmpty
        aria-label={strings.getProjectPickerButtonAriaLabel()}
        data-test-subj="project-picker-button"
        size="s"
        iconType="crossProjectSearch"
        onClick={() => setShowPopover(!showPopover)}
        color="text"
      >
        {activeProjectsCount === totalProjectCount
          ? strings.allButtonLabel()
          : `${activeProjectsCount}/${totalProjectCount}`}
      </EuiButtonEmpty>
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
      >
        <EuiPopoverTitle paddingSize="s">
          <EuiFlexGroup responsive={false} justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem>
              <EuiTitle size="xxs">
                <h5>{strings.getProjectPickerPopoverTitle()}</h5>
              </EuiTitle>
            </EuiFlexItem>
            {settingsComponent && <EuiFlexItem grow={false}>{settingsComponent}</EuiFlexItem>}
          </EuiFlexGroup>
        </EuiPopoverTitle>
        {isReadonly && (
          <EuiCallOut
            size="s"
            css={styles.callout}
            title={strings.getProjectPickerReadonlyCallout()}
            iconType="info"
          />
        )}
        <ProjectPickerContent
          projectRouting={projectRouting}
          onProjectRoutingChange={onProjectRoutingChange}
          projects={{ originProject, linkedProjects, isLoading, error }}
          isReadonly={isReadonly}
        />
      </EuiPopover>
    </EuiTourStep>
  );
};

export const DisabledProjectPicker = ({ totalProjectCount }: { totalProjectCount: number }) => {
  const styles = useMemoCss(projectPickerStyles);
  if (totalProjectCount <= 1) {
    return null;
  }
  return (
    <EuiToolTip content={strings.getProjectPickerDisabledTooltip()}>
      <EuiButtonIcon
        css={styles.disabledButton}
        aria-label={strings.getProjectPickerButtonAriaLabel()}
        data-test-subj="project-picker-button-disabled"
        size="xs"
        isDisabled
        display="fill"
        iconType={CPSIconDisabled}
      />
    </EuiToolTip>
  );
};

const projectPickerStyles = {
  popover: ({ euiTheme }: UseEuiTheme) =>
    css({
      width: euiTheme.base * 35,
    }),
  disabledButton: ({ euiTheme }: UseEuiTheme) =>
    css({
      margin: euiTheme.size.s,
    }),
  callout: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: euiTheme.size.m,
    }),
};
