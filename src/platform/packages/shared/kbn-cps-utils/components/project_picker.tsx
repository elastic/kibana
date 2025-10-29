/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** @jsx jsx */
import { jsx } from '@emotion/react';
import { useEffect, useState } from 'react';
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
import type { ProjectRouting } from '@kbn/es-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CpsPluginStart } from '@kbn/cps/public';
import { ProjectListItem } from './project_list_item';

export const strings = {
  getProjectPickerButtonAriaLabel: () =>
    i18n.translate('cpsUtils.projectPicker.projectPickerButtonLabel', {
      defaultMessage: 'Cross-project search project picker',
    }),
  getProjectPickerButtonLabel: (numberOfProjects: number, totalProjects: number) =>
    i18n.translate('cpsUtils.projectPicker.originProjectTooltip', {
      defaultMessage:
        'Searching {numberOfProjects} of {totalProjects, plural, one {# project} other {# projects}}',
      values: {
        numberOfProjects,
        totalProjects,
      },
    }),
  getProjectPickerPopoverTitle: () =>
    i18n.translate('cpsUtils.projectPicker.projectPickerPopoverTitle', {
      defaultMessage: 'Cross-project search scope',
    }),
  getManageCrossProjectSearchLabel: () =>
    i18n.translate('cpsUtils.projectPicker.manageCrossProjectSearchLabel', {
      defaultMessage: 'Manage cross-project search',
    }),
  getOriginProjectLabel: () =>
    i18n.translate('cpsUtils.projectPicker.thisProjectLabel', {
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

export interface ProjectPickerProps {
  projectRouting?: ProjectRouting;
  onProjectRoutingChange: (projectRouting: ProjectRouting) => void;
}

interface CpsServices {
  cps: CpsPluginStart;
}

export const ProjectPicker = ({ projectRouting, onProjectRoutingChange }: ProjectPickerProps) => {
  const [showProjectPickerPopover, setShowProjectPickerPopover] = useState(false);
  const [originProject, setOriginProject] = useState<Project | null>(null);
  const [linkedProjects, setLinkedProjects] = useState<Project[]>([]);

  const { euiTheme } = useEuiTheme();
  const { cps } = useKibana<CpsServices>().services;

  let projects: Project[] = [];

  if (!originProject) {
  } else {
    projects = projectRouting === '_alias:_origin' ? [originProject] : [originProject, ...linkedProjects];
  }

  useEffect(() => {
    // Only fetch projects in serverless environments where cpsManager is available
    if (!cps?.cpsManager) return;

    const subscription = cps.cpsManager.projects$.subscribe((projectsData: { origin: Project | null; linkedProjects: Project[] }) => {
      setOriginProject(projectsData.origin);
      setLinkedProjects(projectsData.linkedProjects);
    });

    return () => subscription.unsubscribe();
  }, [cps]);

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
          originProjectId={originProject?._id ?? ''}
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
                    aria-label={i18n.translate('cpsUtils.projectPicker.settingsButtonLabel', {
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
            idSelected={projectRouting ?? '_alias:*'}
            options={[
              {
                id: '_alias:*',
                label: i18n.translate('cpsUtils.projectPicker.allProjectsLabel', {
                  defaultMessage: 'All projects',
                }),
              },
              {
                id: '_alias:_origin',
                label: strings.getOriginProjectLabel(),
              },
            ]}
            onChange={(value: string) => {
              // TODO: add telemetry for project scope change?
              let newProjectRouting: ProjectRouting;
              if (value === '_alias:_origin') {
                newProjectRouting = '_alias:_origin';
              } else {
                newProjectRouting = undefined;
              }
              onProjectRoutingChange?.(newProjectRouting);
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
                id="cpsUtils.projectPicker.numberOfProjectsDescription"
                defaultMessage="Searching across {numberOfProjects, plural, one {# project} other {# projects}}"
                values={{
                  numberOfProjects:
                    projectRouting === '_alias:_origin' ? 1 : linkedProjects.length + 1,
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
