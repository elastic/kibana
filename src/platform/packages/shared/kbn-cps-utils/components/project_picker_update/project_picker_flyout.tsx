/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
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
import type { ProjectRouting } from '@kbn/es-query';
import { ProjectPickerList } from './blocks';
import { ProjectPickerFrameBody, ProjectPickerFrameFooter } from './blocks/frame/partials';
import { ProjectPickerFrameHeaderActions } from './blocks/frame/partials/header';
import {
  ProjectPickerStateProvider,
  useProjectPickerState,
  type ProjectPickerStateProviderProps,
} from './state';
import { areProjectRoutingsEquivalent } from './utils';

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
  extends Pick<
    ProjectPickerStateProviderProps,
    | 'availableProjects'
    | 'defaultProjectRoutingGetter'
    | 'controlsState'
    | 'originProjectId'
    | 'fetchProjectsByRouting'
    | 'projectRoutingStrategy'
  > {
  projectRouting: ProjectRouting;
  onApplyChanges: (projectRouting: NonNullable<ProjectRouting>) => void;
  onClose: () => void;
  applyButtonLabel?: ReactNode;
  backButtonLabel?: string;
  canApplyUnchangedProjectRouting?: boolean;
  discardButtonLabel?: ReactNode;
  titleId?: string;
  title?: ReactNode;
}

interface ProjectPickerFlyoutFooterActionsProps {
  applyButtonLabel: ReactNode;
  canApplyUnchangedProjectRouting: boolean;
  currentProjectRouting: ProjectRouting | undefined;
  discardButtonLabel: ReactNode;
  hasUnsavedChanges: boolean;
  onApplyChanges: (projectRouting: NonNullable<ProjectRouting>) => void;
  onDiscardChanges: () => void;
}

function ProjectPickerFlyoutFooterActions({
  applyButtonLabel,
  canApplyUnchangedProjectRouting,
  currentProjectRouting,
  discardButtonLabel,
  hasUnsavedChanges,
  onApplyChanges,
  onDiscardChanges,
}: ProjectPickerFlyoutFooterActionsProps) {
  const { isFilterProposalPending } = useProjectPickerState();
  const canApplyChanges =
    !isFilterProposalPending && (hasUnsavedChanges || canApplyUnchangedProjectRouting);

  const handleApplyChanges = useCallback(() => {
    if (!canApplyChanges || currentProjectRouting === undefined) {
      return;
    }

    onApplyChanges(currentProjectRouting);
  }, [canApplyChanges, currentProjectRouting, onApplyChanges]);

  return (
    <>
      <ProjectPickerFrameFooter />
      <EuiHorizontalRule margin="m" />
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj="projectPickerFlyoutDiscardButton"
            disabled={!hasUnsavedChanges}
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
            isDisabled={!canApplyChanges}
            onClick={handleApplyChanges}
          >
            {applyButtonLabel}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}

export function ProjectPickerFlyoutContent({
  applyButtonLabel = defaultApplyButtonLabel,
  availableProjects,
  backButtonLabel = defaultBackButtonLabel,
  canApplyUnchangedProjectRouting = false,
  defaultProjectRoutingGetter,
  discardButtonLabel = defaultDiscardButtonLabel,
  controlsState,
  onApplyChanges,
  onClose,
  fetchProjectsByRouting,
  originProjectId,
  projectRouting,
  projectRoutingStrategy,
  titleId: titleIdProp,
  title = defaultTitle,
}: ProjectPickerFlyoutProps) {
  const generatedTitleId = useGeneratedHtmlId();
  const titleId = titleIdProp ?? generatedTitleId;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [stagedProjectRouting, setStagedProjectRouting] = useState<ProjectRouting | undefined>();
  const [pickerResetCounter, setPickerResetCounter] = useState(0);

  // `projectRouting` is the persisted value. Consumers may hydrate it after first paint
  // (e.g. redux initialize-on-mount); keep the getter identity tied to the live draft so
  // the provider re-ingests when that happens, before the user stages an edit.
  const currentProjectRouting = stagedProjectRouting ?? projectRouting;
  const currentProjectRoutingGetter = useCallback(
    () => currentProjectRouting,
    [currentProjectRouting]
  );

  const hasUnsavedChanges = useMemo(() => {
    if (stagedProjectRouting === undefined) {
      return false;
    }

    return !areProjectRoutingsEquivalent(
      stagedProjectRouting,
      projectRouting,
      availableProjects.map((project) => project._id),
      originProjectId
    );
  }, [availableProjects, originProjectId, projectRouting, stagedProjectRouting]);

  const handleDiscardChanges = useCallback(() => {
    setStagedProjectRouting(undefined);
    setPickerResetCounter((counter) => counter + 1);
  }, []);

  return (
    <ProjectPickerStateProvider
      key={pickerResetCounter}
      availableProjects={availableProjects}
      defaultProjectRoutingGetter={defaultProjectRoutingGetter}
      currentProjectRoutingGetter={currentProjectRoutingGetter}
      controlsState={controlsState}
      originProjectId={originProjectId}
      onProjectRoutingChange={setStagedProjectRouting}
      fetchProjectsByRouting={fetchProjectsByRouting}
      projectRoutingStrategy={projectRoutingStrategy}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiToolTip content={backButtonLabel} disableScreenReaderOutput>
              <EuiButtonIcon
                aria-label={backButtonLabel}
                color="text"
                data-test-subj="projectPickerFlyoutBackButton"
                iconType="chevronSingleLeft"
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
            <ProjectPickerFrameHeaderActions />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <ProjectPickerFrameBody scrollContainerRef={scrollContainerRef}>
          <ProjectPickerList scrollContainerRef={scrollContainerRef} />
        </ProjectPickerFrameBody>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <ProjectPickerFlyoutFooterActions
          applyButtonLabel={applyButtonLabel}
          canApplyUnchangedProjectRouting={canApplyUnchangedProjectRouting}
          currentProjectRouting={currentProjectRouting}
          discardButtonLabel={discardButtonLabel}
          hasUnsavedChanges={hasUnsavedChanges}
          onApplyChanges={onApplyChanges}
          onDiscardChanges={handleDiscardChanges}
        />
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
