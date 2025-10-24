/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
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
  useEuiTheme,
  useEuiOverflowScroll,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { ProjectListItem } from './project_list_item';

export const strings = {
  getProjectPickerButtonAriaLabel: () =>
    i18n.translate('unifiedSearch.projectPicker.projectPickerButtonLabel', {
      defaultMessage: 'Cross-project search project picker',
    }),
  getProjectPickerButtonLabel: (numberOfProjects: number, totalProjects: number) =>
    i18n.translate('unifiedSearch.projectPicker.originProjectTooltip', {
      defaultMessage:
        'Searching {numberOfProjects} of {totalProjects, plural, one {# project} other {# projects}}',
      values: {
        numberOfProjects,
        totalProjects,
      },
    }),
  getProjectPickerPopoverTitle: () =>
    i18n.translate('unifiedSearch.projectPicker.projectPickerPopoverTitle', {
      defaultMessage: 'Cross-project search scope',
    }),
  getManageCrossProjectSearchLabel: () =>
    i18n.translate('unifiedSearch.projectPicker.manageCrossProjectSearchLabel', {
      defaultMessage: 'Manage cross-project search',
    }),
  getOriginProjectLabel: () =>
    i18n.translate('unifiedSearch.projectPicker.thisProjectLabel', {
      defaultMessage: 'This project',
    }),
};

export interface Project {
  _id: string;
  _alias: string;
  _type: string;
  _csp: string;
  _region: string;
  [key: string]: string;
}

const response: { origin: Record<string, Project>; linked_projects: Record<string, Project> } = {
  origin: {
    c56c4f8849c64cc6ae59c261f40bd195: {
      _id: 'c56c4f8849c64cc6ae59c261f40bd195',
      _csp: 'aws',
      _alias: 'my-project-b72b95',
      _region: 'N. Virginia (us-east-1)',
      _type: 'security',
      mytag1: 'foo',
      mytag2: 'bar',
      mytag3: 'baz',
      mytag4: 'qux',
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
      _type: 'observability',
      mytag1: 'foo',
      mytag2: 'bar',
    },
    h8a3r0932f40bd195389s3761023ca7aa: {
      _id: 'h8a3r0932f40bd195389s3761023ca7aa',
      _alias: 'cloud-backup-c91q12',
      _csp: 'azure',
      _region: 'Virginia (eastus2)',
      _type: 'security',
      mytag1: 'foo',
      mytag2: 'bar',
    },
    r0932f40bd195389s3761023ca7aa8a3: {
      _id: 'r0932f40bd195389s3761023ca7aa8a3',
      _alias: 'customer-portal-p61068',
      _csp: 'aws',
      _region: 'N. Virginia (us-east-1)',
      _type: 'observability',
    },
    j023ca7aa8a3r0932f40bd195389s376: {
      _id: 'j023ca7aa8a3r0932f40bd195389s376',
      _alias: 'data-analysis-platform-j4962a',
      _csp: 'azure',
      _region: 'Virginia (eastus2)',
      _type: 'observability',
      mytag1: 'foo',
      mytag2: 'bar',
    },
    k40bd195389s3761023ca7aa8a3r0932: {
      _id: 'k40bd195389s3761023ca7aa8a3r0932',
      _alias: 'dev-environment-b19a81',
      _csp: 'azure',
      _region: 'Virginia (eastus2)',
      _type: 'security',
      mytag1: 'foo',
      mytag2: 'bar',
    },
    eaa8a3r0932f40bd195389s3761023ca: {
      _id: 'eaa8a3r0932f40bd195389s3761023ca',
      _alias: 'engineering-dev-ops-k416e1',
      _csp: 'gcp',
      _region: 'N. Virginia (us-east-1)',
      _type: 'elasticsearch',
    },
    t40bd195389s3761023ca7aa8a3r0932: {
      _id: 't40bd195389s3761023ca7aa8a3r0932',
      _alias: 'feature-beta-t149a4',
      _csp: 'gcp',
      _region: 'N. Virginia (us-east-1)',
      _type: 'elasticsearch',
      mytag1: 'foo',
      mytag2: 'bar',
      mytag3: 'baz',
    },
    y023ca7aa8a3r0932f40bd195389s376: {
      _id: 'y023ca7aa8a3r0932f40bd195389s376',
      _alias: 'marketing-site-y7021b',
      _csp: 'gcp',
      _region: 'N. Virginia (us-east-1)',
      _type: 'elasticsearch',
    },
    u8a3r0932f40bd195389s3761023ca7aa: {
      _id: 'u8a3r0932f40bd195389s3761023ca7aa',
      _alias: 'customer-data-u7021b',
      _csp: 'azure',
      _region: 'N. Virginia (us-east-1)',
      _type: 'security',
      mytag1: 'foo',
      mytag2: 'bar',
    },
    p0932f40bd195389s3761023ca7aa8a3: {
      _id: 'p0932f40bd195389s3761023ca7aa8a3',
      _alias: 'customer-analytics-p7021b',
      _csp: 'aws',
      _region: 'N. Virginia (us-east-1)',
      _type: 'observability',
    },
  },
};

export const ProjectPicker = () => {
  const [crossProjectSearchScope, setCrossProjectSearchScope] = useState<string>('all');
  const [showProjectPickerPopover, setShowProjectPickerPopover] = useState(false);
  const [linkedProjects, setProjects] = useState<Project[]>([]);

  const { euiTheme } = useEuiTheme();

  const originProject: Project = Object.values(response.origin)[0];

  const projects =
    crossProjectSearchScope === 'origin' ? [originProject] : [originProject, ...linkedProjects];

  useEffect(() => {
    // TODO: replace with fetch linked projects from cross project API
    setProjects(
      Object.values(response.linked_projects).sort((a, b) => a._alias.localeCompare(b._alias))
    );
  }, []);

  const button = (
    <EuiToolTip
      delay="long"
      content={strings.getProjectPickerButtonLabel(projects.length, linkedProjects.length + 1)}
      disableScreenReaderOutput
    >
      <EuiButtonIcon
        type="link"
        display="base"
        iconType="cluster" // TODO: replace with cross project icon when available in EUI
        aria-label={strings.getProjectPickerButtonAriaLabel()}
        data-test-subj="addFilter"
        onClick={() => setShowProjectPickerPopover(!showProjectPickerPopover)}
        size="s"
        css={{
          backgroundColor: euiTheme.colors.backgroundBaseFormsPrepend,
          border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`,
        }}
      />
    </EuiToolTip>
  );

  const closePopover = () => setShowProjectPickerPopover(false);

  const renderProjectsList = () =>
    projects.map((project, index) => {
      return (
        <ProjectListItem
          key={project._id}
          project={project}
          index={index}
          originProjectId={originProject._id}
        />
      );
    });

  return (
    <EuiPopover
      button={button}
      isOpen={showProjectPickerPopover}
      closePopover={closePopover}
      repositionOnScroll
      anchorPosition="downLeft"
      ownFocus
      panelPaddingSize="none"
      panelProps={{
        css: {
          width: '560px',
        },
      }}
    >
      <EuiFlexGroup
        gutterSize="none"
        direction="column"
        responsive={false}
        css={{ maxHeight: '400px', overflow: 'hidden' }}
      >
        <EuiFlexItem grow={false}>
          <EuiPopoverTitle paddingSize="s">
            <EuiFlexGroup responsive={false} justifyContent="spaceBetween">
              <EuiFlexItem>
                <EuiTitle size="xxs">
                  <h5>{strings.getProjectPickerPopoverTitle()}</h5>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip content={strings.getManageCrossProjectSearchLabel()} repositionOnScroll>
                  <EuiButtonIcon
                    display="empty"
                    iconType="gear"
                    aria-label={i18n.translate('unifiedSearch.projectPicker.settingsButtonLabel', {
                      defaultMessage: 'Manage cross-project search',
                    })}
                    onClick={() => {
                      // TODO: redirect to the correct project settings page
                    }}
                    isDisabled={true}
                    size="xs"
                    color="text"
                  />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPopoverTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            isFullWidth
            legend={strings.getProjectPickerButtonAriaLabel()}
            idSelected={crossProjectSearchScope}
            options={[
              {
                id: 'all',
                value: 'all',
                label: i18n.translate('unifiedSearch.projectPicker.allProjectsLabel', {
                  defaultMessage: 'All projects',
                }),
              },
              {
                id: 'origin',
                value: 'origin',
                label: strings.getOriginProjectLabel(),
              },
            ]}
            onChange={(value: string) => {
              // TODO: add telemetry for project scope change?
              // TODO: propagate the scope change to search settings
              setCrossProjectSearchScope(value);
            }}
            css={{ margin: '8px' }}
            buttonSize="compressed"
          />
          <EuiHorizontalRule margin="none" />
        </EuiFlexItem>
        <EuiFlexItem
          grow={false}
          css={{
            backgroundColor: euiTheme.colors.backgroundBaseSubdued,
            borderBottom: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued}`,
          }}
        >
          <EuiTitle size="xxxs">
            <h6 css={{ padding: `${euiTheme.size.s}` }}>
              <FormattedMessage
                id="unifiedSearch.projectPicker.numberOfProjectsDescription"
                defaultMessage="Searching across {numberOfProjects, plural, one {# project} other {# projects}}"
                values={{
                  numberOfProjects:
                    crossProjectSearchScope === 'origin' ? 1 : linkedProjects.length + 1,
                }}
              />
            </h6>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem
          css={css`
            ${useEuiOverflowScroll('y', true)}
            background-color: ${euiTheme.colors.backgroundBaseSubdued};
          `}
        >
          <EuiFlexGroup direction="column" gutterSize="none" justifyContent="center">
            {renderProjectsList()}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPopover>
  );
};
