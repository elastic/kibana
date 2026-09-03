/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiComboBox,
  EuiFieldText,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux-v7';
import { i18n } from '@kbn/i18n';
import { updateYamlField } from '@kbn/workflows-yaml';
import {
  selectWorkflowDefinition,
  selectYamlString,
} from '../../../entities/workflows/store/workflow_detail/selectors';
import { setYamlString } from '../../../entities/workflows/store/workflow_detail/slice';
import { useKibana } from '../../../hooks/use_kibana';
import { type ServiceAccountSummary, useServiceAccount } from '../../../hooks/use_service_account';

const SERVICE_ACCOUNT_PATH = '/internal/security/service_account';

interface ListServiceAccountsResponse {
  service_accounts: ServiceAccountSummary[];
}

interface WorkflowRunAsFlyoutProps {
  onClose: () => void;
}

export const WorkflowRunAsFlyout = ({ onClose }: WorkflowRunAsFlyoutProps) => {
  const dispatch = useDispatch();
  const { http } = useKibana().services;
  const yamlString = useSelector(selectYamlString);
  const workflowDefinition = useSelector(selectWorkflowDefinition);
  const existingServiceAccountId = workflowDefinition?.settings?.run_as ?? '';
  const existingServiceAccount = useServiceAccount(existingServiceAccountId);
  const [serviceAccounts, setServiceAccounts] = useState<ServiceAccountSummary[]>([]);
  const [serviceAccountId, setServiceAccountId] = useState(existingServiceAccountId);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let mounted = true;

    const loadServiceAccounts = async () => {
      try {
        const response = await http.get<ListServiceAccountsResponse>(SERVICE_ACCOUNT_PATH);
        if (mounted) {
          setServiceAccounts(response.service_accounts);
        }
      } catch (loadError) {
        if (mounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : i18n.translate('workflows.runAs.directoryUnknownError', {
                  defaultMessage: 'The service-account directory could not be loaded.',
                })
          );
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadServiceAccounts();

    return () => {
      mounted = false;
    };
  }, [http]);

  const selectableServiceAccounts = useMemo(() => {
    if (
      existingServiceAccount &&
      !serviceAccounts.some(({ id }) => id === existingServiceAccount.id)
    ) {
      return [existingServiceAccount, ...serviceAccounts];
    }
    return serviceAccounts;
  }, [existingServiceAccount, serviceAccounts]);
  const options = useMemo<Array<EuiComboBoxOptionOption<string>>>(
    () =>
      selectableServiceAccounts.map(({ id, name }) => ({
        label: name,
        value: id,
      })),
    [selectableServiceAccounts]
  );
  const selectedOptions = useMemo<Array<EuiComboBoxOptionOption<string>>>(() => {
    const selectedAccount = selectableServiceAccounts.find(({ id }) => id === serviceAccountId);
    return selectedAccount ? [{ label: selectedAccount.name, value: selectedAccount.id }] : [];
  }, [selectableServiceAccounts, serviceAccountId]);

  const applyServiceAccount = useCallback(() => {
    const normalizedServiceAccountId = serviceAccountId.trim();
    if (!normalizedServiceAccountId) {
      return;
    }

    dispatch(
      setYamlString(updateYamlField(yamlString, 'settings.run_as', normalizedServiceAccountId))
    );
    onClose();
  }, [dispatch, onClose, serviceAccountId, yamlString]);

  return (
    <EuiFlyout
      ownFocus
      size="s"
      onClose={onClose}
      aria-labelledby="workflowRunAsFlyoutTitle"
      data-test-subj="workflowRunAsFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="workflowRunAsFlyoutTitle">
            {i18n.translate('workflows.runAs.flyoutTitle', {
              defaultMessage: 'Run as a service account',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText size="s">
          <p>
            {i18n.translate('workflows.runAs.description', {
              defaultMessage:
                'Select the identity used by saved workflow executions. Save the workflow to apply the binding.',
            })}
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        {error ? (
          <>
            <EuiCallOut
              announceOnMount
              title={i18n.translate('workflows.runAs.directoryErrorTitle', {
                defaultMessage: 'Service-account directory unavailable',
              })}
              color="warning"
              iconType="warning"
              size="s"
            >
              <p>{error}</p>
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        ) : null}
        <EuiFormRow
          label={i18n.translate('workflows.runAs.selectLabel', {
            defaultMessage: 'Service account',
          })}
        >
          <EuiComboBox
            singleSelection={{ asPlainText: true }}
            options={options}
            selectedOptions={selectedOptions}
            onChange={(selected) => setServiceAccountId(selected[0]?.value ?? '')}
            isLoading={isLoading}
            isDisabled={Boolean(error)}
            data-test-subj="workflowRunAsSelect"
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('workflows.runAs.idLabel', {
            defaultMessage: 'Service-account ID',
          })}
          helpText={i18n.translate('workflows.runAs.idHelpText', {
            defaultMessage: 'Enter an ID directly when the directory is unavailable.',
          })}
        >
          <EuiFieldText
            value={serviceAccountId}
            onChange={(event) => setServiceAccountId(event.target.value)}
            data-test-subj="workflowRunAsId"
          />
        </EuiFormRow>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiButtonEmpty onClick={onClose}>
          {i18n.translate('workflows.runAs.cancelAction', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
        <EuiButton
          fill
          onClick={applyServiceAccount}
          disabled={!serviceAccountId.trim()}
          data-test-subj="workflowRunAsApply"
        >
          {i18n.translate('workflows.runAs.applyAction', {
            defaultMessage: 'Apply to YAML',
          })}
        </EuiButton>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
