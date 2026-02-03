/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import type { UseEuiTheme } from '@elastic/eui';
import {
  EuiPopoverTitle,
  EuiButtonGroup,
  EuiHorizontalRule,
  EuiFlexItem,
  EuiFlexGroup,
  EuiTitle,
  EuiCallOut,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import type { ProjectRouting } from '@kbn/es-query';
import type { ProjectsData } from '../types';
import { PROJECT_ROUTING } from '../constants';
import { ProjectListItem } from './project_list_item';
import { strings } from './strings';
import { useFetchProjects } from './use_fetch_projects';

export interface ProjectPickerContentProps {
  projectRouting?: ProjectRouting;
  onProjectRoutingChange: (projectRouting: ProjectRouting) => void;
  fetchProjects: () => Promise<ProjectsData | null>;
  isReadonly?: boolean;
  settingsComponent?: React.ReactNode;
}

const projectPickerOptions = [
  {
    id: PROJECT_ROUTING.ALL,
    label: i18n.translate('cpsUtils.projectPicker.allProjectsLabel', {
      defaultMessage: 'All projects',
    }),
  },
  {
    id: PROJECT_ROUTING.ORIGIN,
    label: strings.getOriginProjectLabel(),
  },
];

export const ProjectPickerContent = ({
  projectRouting,
  onProjectRoutingChange,
  fetchProjects,
  isReadonly = false,
  settingsComponent,
}: ProjectPickerContentProps) => {
  const styles = useMemoCss(projectPickerContentStyles);
  const { originProject, linkedProjects } = useFetchProjects(fetchProjects);

  // Don't render if we don't have the required data yet
  if (!originProject || !linkedProjects) {
    return null;
  }

  const projectsList =
    projectRouting === PROJECT_ROUTING.ORIGIN
      ? [originProject]
      : [originProject, ...linkedProjects];

  return (
    <EuiFlexGroup gutterSize="none" direction="column" responsive={false} css={styles.container}>
      <EuiFlexItem grow={false}>
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
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonGroup
          isFullWidth
          legend={strings.getProjectPickerButtonAriaLabel()}
          idSelected={projectRouting ?? PROJECT_ROUTING.ALL}
          options={projectPickerOptions}
          onChange={(value: string) => {
            // TODO: add telemetry for project scope change?
            onProjectRoutingChange(
              value === PROJECT_ROUTING.ORIGIN ? PROJECT_ROUTING.ORIGIN : PROJECT_ROUTING.ALL
            );
          }}
          css={styles.buttonGroup}
          buttonSize="compressed"
          isDisabled={isReadonly}
        />
        <EuiHorizontalRule margin="none" />
      </EuiFlexItem>
      <EuiFlexItem grow={false} css={styles.projectCountHeader}>
        <EuiTitle size="xxxs">
          <h6 css={styles.projectCountTitle}>
            <FormattedMessage
              id="cpsUtils.projectPicker.numberOfProjectsDescription"
              defaultMessage="Searching across {numberOfProjects, plural, one {# project} other {# projects}}"
              values={{
                numberOfProjects:
                  projectRouting === PROJECT_ROUTING.ORIGIN ? 1 : linkedProjects.length + 1,
              }}
            />
          </h6>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem css={styles.listContainer} className="eui-yScroll">
        <EuiFlexGroup direction="column" gutterSize="none" justifyContent="center">
          {projectsList.map((project, index) => (
            <ProjectListItem
              key={project._id}
              project={project}
              index={index}
              isOriginProject={project._id === originProject._id}
            />
          ))}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const projectPickerContentStyles = {
  container: ({ euiTheme }: UseEuiTheme) =>
    css({
      maxHeight: euiTheme.base * 25,
      overflow: 'hidden',
    }),
  buttonGroup: ({ euiTheme }: UseEuiTheme) =>
    css({
      margin: euiTheme.size.s,
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
    }),
  callout: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: euiTheme.size.m,
    }),
};
