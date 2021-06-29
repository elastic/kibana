/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiFlexGroup, EuiCallOut } from '@elastic/eui';

import { SolutionName, ProjectID, Project } from '../../../common';
import { ProjectListItem, Props as ProjectListItemProps } from './project_list_item';

import { LabsStrings } from '../../i18n';

const { List: strings } = LabsStrings.Components;

export interface Props {
  solutions?: SolutionName[];
  projects: Record<ProjectID, Project>;
  onStatusChange: ProjectListItemProps['onStatusChange'];
}

const EmptyList = () => <EuiCallOut title={strings.getNoProjectsMessage()} />;

export const ProjectList = (props: Props) => {
  const { solutions, projects, onStatusChange } = props;

  const items = Object.values(projects)
    .map((project) => {
      if (!project.isDisplayed) {
        return null;
      }

      // Filter out any panels that don't match the solutions filter, (if provided).
      if (solutions && !solutions.some((solution) => project.solutions.includes(solution))) {
        return null;
      }

      return (
        <li key={project.id}>
          <ProjectListItem project={project} onStatusChange={onStatusChange} />
        </li>
      );
    })
    .filter((item) => item !== null);

  return (
    <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
      {items.length > 0 ? <ul>{items}</ul> : <EmptyList />}
    </EuiFlexGroup>
  );
};
