/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import type { EuiSelectOption, EuiSelectableOption } from '@elastic/eui';
import {
  EuiPopover,
  EuiPopoverTitle,
  EuiButtonIcon,
  EuiButtonGroup,
  EuiHorizontalRule,
  EuiToolTip,
  EuiFlexItem,
  EuiFlexGroup,
  EuiTitle,
  EuiSelectable,
  EuiIcon,
  EuiBadge,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const strings = {
  getProjectPickerButtonLabel: () =>
    i18n.translate('projectPicker.projectPickerButtonLabel', {
      defaultMessage: 'Cross-project search project picker',
    }),
  getProjectPickerPopoverTitle: () =>
    i18n.translate('projectPicker.projectPickerPopoverTitle', {
      defaultMessage: 'Cross-project search scope',
    }),
  getManageCrossProjectSearchLabel: () =>
    i18n.translate('projectPicker.manageCrossProjectSearchLabel', {
      defaultMessage: 'Manage cross-project search',
    }),
};

interface Project {
  id: string;
  server: string;
  tags?: string[];
  solution: string;
}

const getSolutionIcon = (solution: string) => {
  switch (solution) {
    case 'es':
      return 'logoElasticsearch';
    case 'sec':
      return 'logoSecurity';
    case 'oblt':
      return 'logoObservability';
    default:
      return 'empty';
  }
};

export const ProjectPicker = (currentProjectId = 'my-project-b72b95') => {
  const [crossProjectSearchScope, setCrossProjectSearchScope] = useState<string>('all');
  const [showProjectPickerPopover, setShowProjectPickerPopover] = useState(false);
  const [projects, setProjects] = useState<Project[]>([
    {
      id: 'my-project-b72b95',
      server: 'AWS, N. Virginia (us-east-1)',
      tags: ['tag1', 'tag2', 'tag3', 'tag4'],
      solution: 'sec',
    },
    {
      id: 'big-query-analytics-616b96',
      server: 'Azure, Virginia (eastus2)',
      tags: ['tag1', 'tag2'],
      solution: 'oblt',
    },
    {
      id: 'cloud-backup-c91q12',
      server: 'Azure, Virginia (eastus2)',
      tags: ['tag1', 'tag2'],
      solution: 'sec',
    },
    { id: 'customer-portal-p61068', server: 'AWS, N. Virginia (us-east-1)', solution: 'oblt' },
    {
      id: 'data-analysis-platform-j4962a',
      server: 'Azure, Virginia (eastus2)',
      tags: ['tag1', 'tag2'],
      solution: 'oblt',
    },
    { id: 'dev-environment-b19a81', server: 'Azure, Virginia (eastus2)', solution: 'sec' },
    {
      id: 'engineering-dev-ops-k416e1',
      server: 'AWS, N. Virginia (us-east-1)',
      tags: ['tag1', 'tag2', 'tag3', 'tag4'],
      solution: 'es',
    },
    {
      id: 'feature-beta-t149a4',
      server: 'AWS, N. Virginia (us-east-1)',
      tags: ['tag1', 'tag2', 'tag3'],
      solution: 'es',
    },
  ]);

  const currentProject = projects.filter((project) => project.id === currentProjectId);

  const button = (
    <EuiToolTip
      delay="long"
      content={strings.getProjectPickerButtonLabel()}
      disableScreenReaderOutput
    >
      <EuiButtonIcon
        type="link"
        display="base"
        iconType="cluster"
        aria-label={strings.getProjectPickerButtonLabel()}
        data-test-subj="addFilter"
        onClick={() => setShowProjectPickerPopover(!showProjectPickerPopover)}
        size="s"
      />
    </EuiToolTip>
  );

  const closePopover = () => setShowProjectPickerPopover(false);

  const options: EuiSelectableOption[] = (
    crossProjectSearchScope === 'origin' ? currentProject : projects
  ).map((project) => ({
    label: project.id,
    prepend: <EuiIcon type={getSolutionIcon(project.solution)} />,
    append: (
      <>
        <EuiText size="s">
          {project.server}
          {project.tags?.length ? (
            <EuiBadge color="hollow" iconType="tag" css={{ marginLeft: '4px' }}>
              {project.tags.length}
            </EuiBadge>
          ) : null}
        </EuiText>
      </>
    ),
  }));

  return (
    <EuiPopover
      button={button}
      isOpen={showProjectPickerPopover}
      closePopover={closePopover}
      repositionOnScroll
      anchorPosition="downLeft"
      ownFocus
      panelPaddingSize="none"
      panelProps={{ css: { width: '560px' } }}
    >
      <EuiPopoverTitle paddingSize="s">
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem>
            <EuiTitle size="xs">
              <p>{strings.getProjectPickerPopoverTitle()}</p>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip content={strings.getManageCrossProjectSearchLabel()}>
              <EuiButtonIcon
                display="empty"
                iconType="gear"
                aria-label={i18n.translate('projectPicker.settingsButtonLabel', {
                  defaultMessage: 'Manage cross-project search',
                })}
                onClick={() => {
                  // TODO: redirect to settings?
                }}
                size="xs"
                color="text"
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopoverTitle>
      <EuiButtonGroup
        isFullWidth
        legend={strings.getProjectPickerButtonLabel()}
        idSelected={crossProjectSearchScope}
        options={[
          {
            id: 'all',
            value: 'all',
            label: i18n.translate('projectPicker.allProjectsLabel', {
              defaultMessage: 'All projects',
            }),
          },
          {
            id: 'origin',
            value: 'origin',
            label: i18n.translate('projectPicker.thisProjectLabel', {
              defaultMessage: 'This project',
            }),
          },
        ]}
        onChange={(value: string) => setCrossProjectSearchScope(value)}
        css={{ margin: '8px' }}
      />
      <EuiHorizontalRule margin="xs" />
      <EuiSelectable
        listProps={{ showIcons: false }}
        options={[
          {
            label: i18n.translate('projectPicker.numberOfProjectsDescription', {
              defaultMessage: 'Searching across {numberOfProjects} projects',
              values: { numberOfProjects: projects.length },
            }),
            isGroupLabel: true,
          },
          ...options,
        ]}
        onChange={(selectedOptions) => {
          // Handle project selection
        }}
      >
        {(list) => list}
      </EuiSelectable>
    </EuiPopover>
  );
};
