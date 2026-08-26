/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import type { ExampleJob } from '../../common/types';
import { ServiceAccountIdLink } from './service_account_flyout';

interface Props {
  jobs: ExampleJob[];
  busy: string | null;
  onSelect: (job: ExampleJob) => void;
  onCreate: (params: { title: string; description?: string }) => void;
  onViewServiceAccount: (id: string) => void;
}

export const JobList = ({ jobs, busy, onSelect, onCreate, onViewServiceAccount }: Props) => {
  const [title, setTitle] = useState('Nightly report');
  const [description, setDescription] = useState('');

  return (
    <EuiPanel paddingSize="m">
      <EuiTitle size="s">
        <h2>Example jobs</h2>
      </EuiTitle>
      <EuiText size="s" color="subdued">
        <p>
          Each job is a saved object and a workload. The binding lives in Core (
          <code>getBinding</code>), not on the job document — copy this pattern.
        </p>
      </EuiText>
      <EuiSpacer />
      <EuiForm>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow label="Title">
              <EuiFieldText value={title} onChange={(event) => setTitle(event.target.value)} />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow label="Description (optional)">
              <EuiFieldText
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFormRow hasEmptyLabelSpace>
              <EuiButton
                fill
                onClick={() =>
                  onCreate({
                    title,
                    description: description.trim() ? description.trim() : undefined,
                  })
                }
                isLoading={busy === 'Create job'}
              >
                Create job
              </EuiButton>
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiForm>
      <EuiSpacer />
      <EuiBasicTable
        tableCaption="Example jobs"
        items={jobs}
        rowProps={(job) => ({
          onClick: () => onSelect(job),
        })}
        columns={[
          { field: 'title', name: 'Title' },
          { field: 'id', name: 'Id', truncateText: true },
          {
            name: 'Binding',
            render: (job: ExampleJob) =>
              job.binding ? (
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
    </EuiPanel>
  );
};
