/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useRef, type ReactNode } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiTitle,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ProjectPickerList } from './blocks';
import { ProjectPickerFrameBody, ProjectPickerFrameFooter } from './blocks/frame/partials';
import { ProjectPickerFrameHeaderActions } from './blocks/frame/partials/header';
import { ProjectPickerStateProvider, type ProjectPickerStateProviderProps } from './state';
import { type ProjectPickerProps } from './project_picker';
import { ProjectPickerRoutingObserver } from './project_picker_routing_observer';

const defaultTitle = i18n.translate('cpsUtils.projectPicker.flyout.title', {
  defaultMessage: 'Change project scope',
});

const defaultBackButtonLabel = i18n.translate('cpsUtils.projectPicker.flyout.backButtonLabel', {
  defaultMessage: 'Back',
});

const defaultDiscardButtonLabel = i18n.translate(
  'cpsUtils.projectPicker.flyout.discardButtonLabel',
  {
    defaultMessage: 'Discard changes',
  }
);

const defaultApplyButtonLabel = i18n.translate('cpsUtils.projectPicker.flyout.applyButtonLabel', {
  defaultMessage: 'Apply changes',
});

export interface ProjectPickerFlyoutProps
  extends Omit<ProjectPickerStateProviderProps, 'children' | 'initialProjectRouting'>,
    Pick<ProjectPickerProps, 'onProjectRoutingChange' | 'projectRouting'> {
  onApplyChanges: () => void;
  onClose: () => void;
  onDiscardChanges: () => void;
  applyButtonLabel?: ReactNode;
  backButtonLabel?: string;
  discardButtonLabel?: ReactNode;
  isApplyDisabled?: boolean;
  titleId?: string;
  title?: ReactNode;
}

export function ProjectPickerFlyoutContent({
  applyButtonLabel = defaultApplyButtonLabel,
  availableProjects,
  backButtonLabel = defaultBackButtonLabel,
  discardButtonLabel = defaultDiscardButtonLabel,
  isApplyDisabled,
  isReadOnly,
  onApplyChanges,
  onClose,
  onDiscardChanges,
  onProjectRoutingChange,
  originProjectId,
  projectRouting,
  titleId: titleIdProp,
  title = defaultTitle,
}: ProjectPickerFlyoutProps) {
  const generatedTitleId = useGeneratedHtmlId();
  const titleId = titleIdProp ?? generatedTitleId;
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  return (
    <ProjectPickerStateProvider
      availableProjects={availableProjects}
      initialProjectRouting={projectRouting}
      isReadOnly={isReadOnly}
      originProjectId={originProjectId}
    >
      <ProjectPickerRoutingObserver
        onProjectRoutingChange={onProjectRoutingChange}
        projectRouting={projectRouting}
      />
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiToolTip content={backButtonLabel} disableScreenReaderOutput>
              <EuiButtonIcon
                aria-label={backButtonLabel}
                color="text"
                data-test-subj="projectPickerFlyoutBackButton"
                iconType="arrowLeft"
                onClick={onClose}
              />
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="s">
              <h2 id={titleId}>{title}</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ProjectPickerFrameHeaderActions showSpaceDefaultsBadge={false} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <ProjectPickerFrameBody scrollContainerRef={scrollContainerRef}>
          <ProjectPickerList scrollContainerRef={scrollContainerRef} />
        </ProjectPickerFrameBody>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <ProjectPickerFrameFooter />
        <EuiHorizontalRule margin="m" />
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="projectPickerFlyoutDiscardButton"
              flush="left"
              onClick={onDiscardChanges}
            >
              {discardButtonLabel}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="projectPickerFlyoutApplyButton"
              fill
              isDisabled={isApplyDisabled}
              onClick={onApplyChanges}
            >
              {applyButtonLabel}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </ProjectPickerStateProvider>
  );
}

export function ProjectPickerFlyout(props: ProjectPickerFlyoutProps) {
  const titleId = useGeneratedHtmlId();

  return (
    <EuiFlyout
      aria-labelledby={titleId}
      data-test-subj="projectPickerFlyout"
      hideCloseButton
      onClose={props.onClose}
      size="m"
    >
      <ProjectPickerFlyoutContent {...props} titleId={titleId} />
    </EuiFlyout>
  );
}
