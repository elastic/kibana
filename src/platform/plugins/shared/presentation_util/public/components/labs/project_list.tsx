/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiCallOut, useEuiTheme } from '@elastic/eui';

import { css } from '@emotion/react';
import { SolutionName, ProjectID, Project } from '../../../common';
import { ProjectListItem, Props as ProjectListItemProps } from './project_list_item';

import { LabsStrings } from '../../i18n';

const { List: strings } = LabsStrings.Components;

export interface Props {
  solutions?: SolutionName[];
  projects: Record<ProjectID, Project>;
  onStatusChange: ProjectListItemProps['onStatusChange'];
}

const EmptyList = ({ solutions }: { solutions?: SolutionName[] }) => {
  let title = strings.getNoProjectsMessage();

  if (solutions?.length === 1) {
    const solution = solutions[0];
    switch (solution) {
      case 'dashboard':
        title = strings.getNoProjectsInSolutionMessage('Dashboard');
      case 'canvas':
        title = strings.getNoProjectsInSolutionMessage('Canvas');
    }
  }
  return <EuiCallOut title={title} />;
};

export const ProjectList = (props: Props) => {
  const { solutions, projects, onStatusChange } = props;
  const styles = useStyles();

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
        <li key={project.id} css={styles}>
          <ProjectListItem project={project} onStatusChange={onStatusChange} />
        </li>
      );
    })
    .filter((item) => item !== null);

  return (
    <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
      {items.length > 0 ? <ul>{items}</ul> : <EmptyList solutions={solutions} />}
    </EuiFlexGroup>
  );
};

const useStyles = () => {
  const { euiTheme } = useEuiTheme();
  const styles = useMemo(() => {
    return css({
      position: 'relative',
      padding: `${euiTheme.size.m} ${euiTheme.size.xs}`,
      background: euiTheme.colors.emptyShade,
      minWidth: '500px',
      '&:first-child': {
        paddingTop: 0,
      },
      '&:not(:first-child):after': {
        position: 'absolute',
        top: 0,
        right: 0,
        left: 0,
        height: '1px',
        background: euiTheme.colors.lightShade,
        content: '""',
      },
    });
  }, [euiTheme]);
  return styles;
};
