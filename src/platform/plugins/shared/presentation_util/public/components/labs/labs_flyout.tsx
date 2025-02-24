/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React, { ReactNode, useEffect, useMemo, useRef, useState } from 'react';

import { EnvironmentName, Project, ProjectID, ProjectStatus, SolutionName } from '../../../common';
import { LabsStrings } from '../../i18n';

import { getPresentationLabsService } from '../../services/presentation_labs_service';
import { ProjectList } from './project_list';

const { Flyout: strings } = LabsStrings.Components;

export interface Props {
  onClose: () => void;
  solutions?: SolutionName[];
  onEnabledCountChange?: (overrideCount: number) => void;
}

const hasStatusChanged = (
  original: Record<ProjectID, Project>,
  current: Record<ProjectID, Project>
): boolean => {
  for (const id of Object.keys(original) as ProjectID[]) {
    for (const key of Object.keys(original[id].status) as Array<keyof ProjectStatus>) {
      if (original[id].status[key] !== current[id].status[key]) {
        return true;
      }
    }
  }
  return false;
};

export const getOverridenCount = (projects: Record<ProjectID, Project>) =>
  Object.values(projects).filter((project) => project.status.isOverride).length;

export const LabsFlyout = (props: Props) => {
  const { solutions, onEnabledCountChange = () => {}, onClose } = props;
  const labsService = useMemo(() => getPresentationLabsService(), []);

  const [projects, setProjects] = useState(labsService.getProjects());
  const [overrideCount, setOverrideCount] = useState(getOverridenCount(projects));
  const initialStatus = useRef(labsService.getProjects());

  const isChanged = hasStatusChanged(initialStatus.current, projects);

  useEffect(() => {
    setOverrideCount(getOverridenCount(projects));
  }, [projects]);

  useEffect(() => {
    onEnabledCountChange(overrideCount);
  }, [onEnabledCountChange, overrideCount]);

  const onStatusChange = (id: ProjectID, env: EnvironmentName, enabled: boolean) => {
    labsService.setProjectStatus(id, env, enabled);
    setProjects(labsService.getProjects());
  };

  let footer: ReactNode = null;

  const resetButton = (
    <EuiButtonEmpty
      onClick={() => {
        labsService.reset();
        setProjects(labsService.getProjects());
      }}
      isDisabled={!overrideCount}
    >
      {strings.getResetToDefaultLabel()}
    </EuiButtonEmpty>
  );

  const refreshButton = (
    <EuiButton
      color="primary"
      fill={true}
      onClick={() => {
        window.location.reload();
      }}
      isDisabled={!isChanged}
    >
      {strings.getRefreshLabel()}
    </EuiButton>
  );

  footer = (
    <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty iconType="cross" onClick={() => onClose()} flush="left">
            {strings.getCloseButtonLabel()}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>{resetButton}</EuiFlexItem>
            <EuiFlexItem grow={false}>{refreshButton}</EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );

  return (
    <EuiFlyout
      onClose={onClose}
      hideCloseButton={true}
      maskProps={{ headerZindexLocation: 'below' }}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type="beaker" size="l" />
              </EuiFlexItem>
              <EuiFlexItem>{strings.getTitleLabel()}</EuiFlexItem>
            </EuiFlexGroup>
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          <p>{strings.getDescriptionMessage()}</p>
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <ProjectList {...{ projects, solutions, onStatusChange }} />
      </EuiFlyoutBody>
      {footer}
    </EuiFlyout>
  );
};

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default LabsFlyout;
