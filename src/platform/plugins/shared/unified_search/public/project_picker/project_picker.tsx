/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
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
  _id: string;
  _alias: string;
  _type: string;
  _csp: string;
  _region: string;
  tags?: string[];
}

const getSolutionIcon = (solution: string) => {
  switch (solution) {
    case 'elasticsearch':
      return 'logoElasticsearch';
    case 'security':
      return 'logoSecurity';
    case 'observability':
      return 'logoObservability';
    default:
      return 'empty';
  }
};

const getCSPLabel = (csp: string) => {
  switch (csp) {
    case 'aws':
      return 'AWS';
    case 'azure':
      return 'Azure';
    case 'gcp':
      return 'GCP';
  }
};

const response: { origin: Record<string, Project>; linked_projects: Record<string, Project> } = {
  origin: {
    c56c4f8849c64cc6ae59c261f40bd195: {
      _id: 'c56c4f8849c64cc6ae59c261f40bd195',
      _csp: 'aws',
      _alias: 'my-project-b72b95',
      _region: 'N. Virginia (us-east-1)',
      tags: ['tag1', 'tag2', 'tag3', 'tag4'],
      _type: 'security',
    },
  },
  linked_projects: {
    a3b88ea3f195a336ae59c261f40bd195: {
      _id: 'a3b88ea3f195a336ae59c261f40bd195',
      _alias: 'customer-alias-a3b88e',
      _type: 'security',
      _csp: 'azure',
      _region: 'eu-central-2',
      mytag1: 'foo',
      mytag2: 'bar',
    },
    f40bd195389s3761023ca7aa8a3r0932: {
      _id: 'f40bd195389s3761023ca7aa8a3r0932',
      _alias: 'customer-alias-f40bd',
      _type: 'observability',
      _csp: 'aws',
      _region: 'us-west-1',
    },
    g023ca7aa8a3r0932f40bd195389s376: {
      _id: 'g023ca7aa8a3r0932f40bd195389s376',
      _alias: 'big-query-analytics-616b96',
      _csp: 'azure',
      _region: 'Virginia (eastus2)',
      tags: ['tag1', 'tag2'],
      _type: 'observability',
    },
    h8a3r0932f40bd195389s3761023ca7aa: {
      _id: 'h8a3r0932f40bd195389s3761023ca7aa',
      _alias: 'cloud-backup-c91q12',
      _csp: 'azure',
      _region: 'Virginia (eastus2)',
      tags: ['tag1', 'tag2'],
      _type: 'security',
    },
    r0932f40bd195389s3761023ca7aa8a3: {
      _id: 'customer-portal-p61068',
      _alias: 'customer-portal-p61068',
      _csp: 'aws',
      _region: 'AWS, N. Virginia (us-east-1)',
      _type: 'observability',
    },
    j023ca7aa8a3r0932f40bd195389s376: {
      _id: 'data-analysis-platform-j4962a',
      _alias: 'data-analysis-platform-j4962a',
      _csp: 'azure',
      _region: 'Virginia (eastus2)',
      tags: ['tag1', 'tag2'],
      _type: 'observability',
    },
    k40bd195389s3761023ca7aa8a3r0932: {
      _id: 'dev-environment-b19a81',
      _alias: 'dev-environment-b19a81',
      _csp: 'azure',
      _region: 'Virginia (eastus2)',
      _type: 'security',
    },
    eaa8a3r0932f40bd195389s3761023ca: {
      _id: 'engineering-dev-ops-k416e1',
      _alias: 'engineering-dev-ops-k416e1',
      _csp: 'aws',
      _region: 'AWS, N. Virginia (us-east-1)',
      tags: ['tag1', 'tag2', 'tag3', 'tag4'],
      _type: 'es',
    },
    t40bd195389s3761023ca7aa8a3r0932: {
      _id: 'feature-beta-t149a4',
      _alias: 'feature-beta-t149a4',
      _csp: 'aws',
      _region: 'AWS, N. Virginia (us-east-1)',
      tags: ['tag1', 'tag2', 'tag3'],
      _type: 'es',
    },
  },
};

export const ProjectPicker = (currentProjectId = 'my-project-b72b95') => {
  const [crossProjectSearchScope, setCrossProjectSearchScope] = useState<string>('all');
  const [showProjectPickerPopover, setShowProjectPickerPopover] = useState(false);
  const [linkedProjects, setProjects] = useState<Project[]>(
    Object.values(response.linked_projects)
  );

  const originProject: Project = Object.values(response.origin)[0];

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
    crossProjectSearchScope === 'origin' ? [originProject] : [originProject, ...linkedProjects]
  ).map((project: Project) => ({
    label: project._id,
    prepend: <EuiIcon type={getSolutionIcon(project._type)} />,
    append: (
      <>
        <EuiText size="s">
          {`${getCSPLabel(project._csp)}, ${project._region}`}
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
              defaultMessage:
                'Searching across {numberOfProjects, plural, one {# project} other {# projects}}',
              values: {
                numberOfProjects:
                  crossProjectSearchScope === 'origin' ? 1 : linkedProjects.length + 1,
              },
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
