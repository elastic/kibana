/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import type { ExampleJob, SerializedUser } from '../../common/types';
import { IdentityCards } from './identity_cards';
import { ServiceAccountIdLink } from './service_account_flyout';

interface Props {
  job: ExampleJob;
  you: SerializedUser | null;
  busy: string | null;
  onBack: () => void;
  onOpenAttach: () => void;
  onDetach: () => void;
  onRun: () => void;
  onDelete: () => void;
  onViewServiceAccount: (id: string) => void;
}

export const JobDetail = ({
  job,
  you,
  busy,
  onBack,
  onOpenAttach,
  onDetach,
  onRun,
  onDelete,
  onViewServiceAccount,
}: Props) => {
  return (
    <EuiPanel paddingSize="m">
      <EuiButtonEmpty onClick={onBack} flush="left">
        Back to jobs
      </EuiButtonEmpty>
      <EuiTitle size="s">
        <h2>{job.title}</h2>
      </EuiTitle>
      {job.description && (
        <EuiText size="s" color="subdued">
          <p>{job.description}</p>
        </EuiText>
      )}
      <EuiSpacer />
      <EuiDescriptionList
        type="column"
        listItems={[
          { title: 'Job id (workloadId)', description: <code>{job.id}</code> },
          {
            title: 'Binding',
            description: job.binding ? (
              <span>
                <EuiBadge color="success">Bound</EuiBadge>{' '}
                <ServiceAccountIdLink
                  id={job.binding.serviceAccountId}
                  onClick={onViewServiceAccount}
                />
              </span>
            ) : (
              <EuiBadge>Unbound</EuiBadge>
            ),
          },
        ]}
      />
      <EuiSpacer />
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiButton onClick={onOpenAttach} isDisabled={busy !== null}>
            Attach
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton onClick={onDetach} isDisabled={busy !== null || !job.binding}>
            Detach
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            onClick={onRun}
            isDisabled={busy !== null || !job.binding}
            isLoading={busy === 'Run as service account'}
          >
            Run as service account
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty color="danger" onClick={onDelete} isDisabled={busy !== null}>
            Delete job
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>

      {!job.binding && (
        <>
          <EuiSpacer />
          <EuiCallOut announceOnMount title="This job has no binding" color="primary" size="s">
            Attach a service account before running. Run uses the job id as the workload id — the
            same pattern alerting should copy.
          </EuiCallOut>
        </>
      )}

      <EuiHorizontalRule />
      <IdentityCards you={you} lastRun={job.lastRun} />

      {job.lastRun && (
        <>
          <EuiSpacer />
          <EuiText size="s" color="subdued">
            <p>Last run {job.lastRun.at}</p>
          </EuiText>
          <EuiCodeBlock language="json" overflowHeight={240} isCopyable>
            {JSON.stringify(job.lastRun, null, 2)}
          </EuiCodeBlock>
        </>
      )}
    </EuiPanel>
  );
};
