/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiBetaBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useState } from 'react';
import { useDispatch } from 'react-redux-v7';
import { isHttpFetchError } from '@kbn/core-http-browser';
import type { AccessControlInput } from '@kbn/entity-access-control';
import { AccessControlForm } from '@kbn/entity-access-control-ui';
import { i18n } from '@kbn/i18n';
import { useDebouncedValue } from '@kbn/react-hooks';
import { useQuery } from '@kbn/react-query';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type {
  WorkflowAccessControlRole,
  WorkflowAccessControlUpdateResponseDto,
  WorkflowDetailDto,
} from '@kbn/workflows';
import { setWorkflow } from '../../../entities/workflows/store/workflow_detail/slice';
import { useKibana } from '../../../hooks/use_kibana';

const roles = [
  {
    value: 'viewer',
    text: i18n.translate('workflows.access.viewerLabel', { defaultMessage: 'Viewer' }),
  },
  {
    value: 'executor',
    text: i18n.translate('workflows.access.executorLabel', { defaultMessage: 'Executor' }),
  },
  {
    value: 'editor',
    text: i18n.translate('workflows.access.editorLabel', { defaultMessage: 'Editor' }),
  },
] as const;

export const WorkflowAccessControlModal = ({
  workflow,
  onClose,
}: {
  workflow: WorkflowDetailDto;
  onClose: () => void;
}): React.ReactElement => {
  const { euiTheme } = useEuiTheme();
  const { http, userProfile } = useKibana().services;
  const dispatch = useDispatch();
  const [value, setValue] = useState<AccessControlInput<WorkflowAccessControlRole>>(
    workflow.access_control ?? { access_mode: 'public', entries: [] }
  );
  const { data: currentProfile, isError: isCurrentProfileError } = useQuery({
    queryKey: ['workflowAccessCurrentProfile'],
    queryFn: () => userProfile.getCurrent<UserProfileWithAvatar['data']>({ dataPath: 'avatar' }),
  });
  const ownerId =
    workflow.owner_id ?? (workflow.permissions?.manage ? currentProfile?.uid : undefined);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 200);
  const [isSaving, setIsSaving] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInvalidAccess, setIsInvalidAccess] = useState(false);
  const uids = [ownerId, ...(value.entries ?? []).map(({ id }) => id)].filter((id): id is string =>
    Boolean(id)
  );
  const { data: profiles = [] } = useQuery({
    queryKey: ['workflowAccessProfiles', ...uids],
    enabled: uids.length > 0,
    queryFn: () =>
      userProfile.bulkGet<UserProfileWithAvatar['data']>({
        uids: new Set(uids),
        dataPath: 'avatar',
      }),
  });
  const {
    data: suggestedProfiles = [],
    isFetching,
    isError: isSearchError,
  } = useQuery({
    queryKey: ['workflowAccessSuggestions', workflow.id, debouncedSearch],
    enabled: value.access_mode === 'private' && Boolean(currentProfile),
    queryFn: () =>
      userProfile.suggest<UserProfileWithAvatar['data']>(
        `/internal/workflows/${encodeURIComponent(workflow.id)}/_suggest_user_profiles`,
        { name: debouncedSearch, size: 20, dataPath: 'avatar' }
      ),
  });
  const save = async () => {
    setIsSaving(true);
    setHasError(false);
    setIsInvalidAccess(false);
    try {
      const savedAccess = await http.put<WorkflowAccessControlUpdateResponseDto>(
        `/internal/workflows/${encodeURIComponent(workflow.id)}/access_control`,
        { body: JSON.stringify(value) }
      );
      dispatch(setWorkflow({ ...workflow, ...savedAccess }));
      onClose();
    } catch (error) {
      setHasError(true);
      setIsInvalidAccess(isHttpFetchError(error) && error.response?.status === 400);
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <EuiModal
      onClose={onClose}
      aria-labelledby="workflowAccessTitle"
      css={css({ width: euiTheme.breakpoint.m })}
    >
      <EuiModalHeader>
        <EuiFlexGroup alignItems="center" gutterSize="m" wrap>
          <EuiFlexItem grow={false}>
            <EuiModalHeaderTitle id="workflowAccessTitle">
              {i18n.translate('workflows.access.modalTitle', { defaultMessage: 'Workflow access' })}
            </EuiModalHeaderTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBetaBadge
              label={i18n.translate('workflows.access.technicalPreviewLabel', {
                defaultMessage: 'Technical preview',
              })}
              size="s"
              color="hollow"
              tooltipContent={i18n.translate('workflows.access.technicalPreviewTooltip', {
                defaultMessage:
                  'Workflow access control is in technical preview and may change or be removed in a future release. It is not covered by the support SLA.',
              })}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalHeader>
      <EuiModalBody>
        <KbnWarningCallout
          size="s"
          title={i18n.translate('workflows.access.executionDataWarningTitle', {
            defaultMessage: 'Private access does not restrict execution data queries',
          })}
          text={i18n.translate('workflows.access.executionDataWarningDescription', {
            defaultMessage:
              'Workflow access rules apply in the Workflows UI and APIs. Users with Elasticsearch access to execution or step data can still read it through Discover, ES|QL, or direct queries, even when the workflow is private.',
          })}
        />
        <EuiSpacer size="m" />
        {(hasError || isSearchError || isCurrentProfileError) && (
          <>
            <KbnDangerCallout
              announceOnMount
              size="s"
              title={i18n.translate('workflows.access.saveErrorMessage', {
                defaultMessage: 'Could not update access or load users. Try again.',
              })}
              text={
                isInvalidAccess
                  ? i18n.translate('workflows.access.recipientPrivilegesError', {
                      defaultMessage:
                        'Selected users must have the Workflows privileges required for their access roles in this space.',
                    })
                  : undefined
              }
            />
            <EuiSpacer size="m" />
          </>
        )}
        <AccessControlForm
          value={value}
          onChange={setValue}
          ownerId={ownerId}
          currentUserId={currentProfile?.uid}
          profiles={currentProfile ? [...profiles, currentProfile] : profiles}
          suggestedProfiles={suggestedProfiles}
          onSearch={setSearch}
          roles={roles}
          isSearching={isFetching}
          isDisabled={isSaving}
          allowPublicEntries={false}
          publicDescription={i18n.translate('workflows.access.publicDescription', {
            defaultMessage:
              'Access is controlled by workflow permissions in this space. User-specific restrictions apply only when this workflow is private.',
          })}
        />
        {value.access_mode === 'private' && (
          <EuiText size="s">
            {i18n.translate('workflows.access.rolesDescription', {
              defaultMessage:
                'Viewers can view. Executors can view and run. Editors can view, run, and edit. Feature privileges still apply.',
            })}
          </EuiText>
        )}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose} isDisabled={isSaving}>
          {i18n.translate('workflows.access.cancelButtonLabel', { defaultMessage: 'Cancel' })}
        </EuiButtonEmpty>
        <EuiButton
          onClick={save}
          fill
          isLoading={isSaving}
          isDisabled={!ownerId}
          data-test-subj="workflowAccessSave"
        >
          {i18n.translate('workflows.access.saveButtonLabel', { defaultMessage: 'Save' })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
