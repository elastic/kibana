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
import { useState } from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import type { UseEuiTheme } from '@elastic/eui';
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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import type { ProjectRouting } from '@kbn/es-query';
import type { CPSProject } from '../types';
import { ProjectListItem } from './project_list_item';
import { strings } from './strings';

export interface ProjectPickerComponentProps {
  projectRouting?: ProjectRouting;
  onProjectRoutingChange: (projectRouting: ProjectRouting) => void;
  originProject: CPSProject;
  linkedProjects: CPSProject[];
}

const projectPickerOptions = [
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
];

export const ProjectPickerComponent = ({
  projectRouting,
  onProjectRoutingChange,
  originProject,
  linkedProjects,
}: ProjectPickerComponentProps) => {
  const [showPopover, setShowPopover] = useState(false);
  const styles = useMemoCss(projectPickerStyles);

  const projects =
    projectRouting === '_alias:_origin' ? [originProject] : [originProject, ...linkedProjects];

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
        data-test-subj="project-picker-button"
        onClick={() => setShowPopover(!showPopover)}
        size="s"
        css={styles.button}
      />
    </EuiToolTip>
  );

  return (
    <EuiPopover
      button={button}
      isOpen={showPopover}
      closePopover={() => setShowPopover(false)}
      repositionOnScroll
      anchorPosition="downLeft"
      ownFocus
      panelPaddingSize="none"
      panelProps={{ css: styles.popover }}
    >
      <EuiFlexGroup gutterSize="none" direction="column" responsive={false} css={styles.container}>
        <EuiFlexItem grow={false}>
          <EuiPopoverTitle paddingSize="s">
            <EuiFlexGroup responsive={false} justifyContent="spaceBetween">
              <EuiFlexItem>
                <EuiTitle size="xxs">
                  <h5>{strings.getProjectPickerPopoverTitle()}</h5>
                </EuiTitle>
              </EuiFlexItem>
              {/* TODO: Add settings button when cps management is available
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
              </EuiFlexItem> */}
            </EuiFlexGroup>
          </EuiPopoverTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            isFullWidth
            legend={strings.getProjectPickerButtonAriaLabel()}
            idSelected={projectRouting ?? '_alias:*'}
            options={projectPickerOptions}
            onChange={(value: string) => {
              // TODO: add telemetry for project scope change?
              onProjectRoutingChange(value === '_alias:_origin' ? '_alias:_origin' : undefined);
            }}
            css={styles.buttonGroup}
            buttonSize="compressed"
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
                    projectRouting === '_alias:_origin' ? 1 : linkedProjects.length + 1,
                }}
              />
            </h6>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem css={styles.listContainer} className="eui-yScroll">
          <EuiFlexGroup direction="column" gutterSize="none" justifyContent="center">
            {projects.map((project, index) => (
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
    </EuiPopover>
  );
};

const projectPickerStyles = {
  popover: ({ euiTheme }: UseEuiTheme) =>
    css({
      width: euiTheme.base * 35,
    }),
  button: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundBaseFormsPrepend,
      border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBasePlain}`,
    }),
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
};
