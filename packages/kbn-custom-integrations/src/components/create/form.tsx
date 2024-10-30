/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import {
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiIconTip,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useActor, useSelector } from '@xstate/react';
import { ErrorCallout } from './error_callout';
import { CreateCustomIntegrationActorRef } from '../../state_machines/create/state_machine';
import {
  CreateCustomIntegrationOptions,
  WithOptionalErrors,
  WithTouchedFields,
} from '../../state_machines/create/types';
import { Dataset, IntegrationError } from '../../types';
import { hasFailedSelector } from '../../state_machines/create/selectors';
import {
  datasetNameWillBePrefixed,
  getDatasetNamePrefix,
  prefixDatasetName,
} from '../../state_machines/create/pipelines/fields';

// NOTE: Hardcoded for now. We will likely extend the functionality here to allow the selection of the type.
// And also to allow adding multiple datasets.
const DATASET_TYPE = 'logs' as const;

export interface CreateTestSubjects {
  integrationName?: string;
  datasetName?: string;
  errorCallout?: {
    callout?: string;
    retryButton?: string;
  };
}

export const ConnectedCreateCustomIntegrationForm = ({
  machineRef,
  testSubjects,
}: {
  machineRef: CreateCustomIntegrationActorRef;
  testSubjects?: CreateTestSubjects;
}) => {
  const [state, send] = useActor(machineRef);

  const updateIntegrationName = useCallback(
    (integrationName: string) => {
      send({ type: 'UPDATE_FIELDS', fields: { integrationName } });
    },
    [send]
  );

  const updateDatasetName = useCallback(
    (datasetName: string) => {
      send({
        type: 'UPDATE_FIELDS',
        fields: {
          datasets: [{ type: DATASET_TYPE, name: datasetName }],
        },
      });
    },
    [send]
  );

  const retry = useCallback(() => {
    send({ type: 'RETRY' });
  }, [send]);

  const hasFailed = useSelector(machineRef, hasFailedSelector);

  return (
    <CreateCustomIntegrationForm
      integrationName={state?.context.fields.integrationName}
      datasetName={state?.context.fields.datasets[0].name} // NOTE: Hardcoded for now until we support multiple datasets
      errors={state.context.errors}
      updateIntegrationName={updateIntegrationName}
      updateDatasetName={updateDatasetName}
      touchedFields={state?.context.touchedFields}
      hasFailed={hasFailed}
      onRetry={hasFailed ? retry : undefined}
      testSubjects={testSubjects}
    />
  );
};

interface FormProps {
  integrationName: CreateCustomIntegrationOptions['integrationName'];
  datasetName: Dataset['name'];
  errors: WithOptionalErrors['errors'];
  touchedFields: WithTouchedFields['touchedFields'];
  updateIntegrationName: (integrationName: string) => void;
  updateDatasetName: (integrationName: string) => void;
  hasFailed: boolean;
  onRetry?: () => void;
  testSubjects?: CreateTestSubjects;
}

export const CreateCustomIntegrationForm = ({
  integrationName,
  datasetName,
  errors,
  touchedFields,
  updateIntegrationName,
  updateDatasetName,
  onRetry,
  testSubjects,
}: FormProps) => {
  return (
    <>
      <EuiText color="subdued">
        <p>
          {i18n.translate('customIntegrationsPackage.create.configureIntegrationDescription', {
            defaultMessage: 'Configure integration',
          })}
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued">
            {i18n.translate(
              'customIntegrationsPackage.create.configureIntegrationDescription.helper',
              {
                defaultMessage:
                  'Elastic creates an integration to streamline connecting your log data to the Elastic Stack.',
              }
            )}
          </EuiText>
        </p>
      </EuiText>
      <EuiSpacer size="l" />
      <EuiForm fullWidth>
        <EuiFormRow
          label={
            <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
              <EuiFlexItem grow={false}>
                {i18n.translate('customIntegrationsPackage.create.integration.name', {
                  defaultMessage: 'Integration name',
                })}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiIconTip
                  content={i18n.translate(
                    'customIntegrationsPackage.create.integration.name.tooltip',
                    {
                      defaultMessage:
                        'The name of the integration that will be created to organize your custom logs.',
                    }
                  )}
                  position="right"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          }
          helpText={i18n.translate('customIntegrationsPackage.create.integration.helper', {
            defaultMessage:
              "All lowercase, max 100 chars, special characters will be replaced with '_'.",
          })}
          isInvalid={hasErrors(errors?.fields?.integrationName) && touchedFields.integrationName}
          error={errorsList(errors?.fields?.integrationName)}
        >
          <EuiFieldText
            placeholder={i18n.translate(
              'customIntegrationsPackage.create.integration.placeholder',
              {
                defaultMessage: 'Give your integration a name',
              }
            )}
            value={integrationName}
            onChange={(event) => updateIntegrationName(event.target.value)}
            isInvalid={hasErrors(errors?.fields?.integrationName) && touchedFields.integrationName}
            max={100}
            data-test-subj={
              testSubjects?.integrationName ??
              'customIntegrationsPackageCreateFormIntegrationNameInput'
            }
          />
        </EuiFormRow>
        <EuiFormRow
          label={
            <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
              <EuiFlexItem grow={false}>
                {i18n.translate('customIntegrationsPackage.create.dataset.name', {
                  defaultMessage: 'Dataset name',
                })}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiIconTip
                  content={i18n.translate('customIntegrationsPackage.create.dataset.name.tooltip', {
                    defaultMessage:
                      'The name of the dataset associated with this integration. This will be part of the Elasticsearch data stream name ',
                  })}
                  position="right"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          }
          helpText={[
            i18n.translate('customIntegrationsPackage.create.dataset.helper', {
              defaultMessage:
                "All lowercase, max 100 chars, special characters will be replaced with '_'.",
            }),
            datasetNameWillBePrefixed(datasetName, integrationName)
              ? i18n.translate(
                  'customIntegrationsPackage.create.dataset.name.tooltipPrefixMessage',
                  {
                    defaultMessage:
                      'This name will be prefixed with {prefixValue}, e.g. {prefixedDatasetName}',
                    values: {
                      prefixValue: getDatasetNamePrefix(integrationName),
                      prefixedDatasetName: prefixDatasetName(datasetName, integrationName),
                    },
                  }
                )
              : '',
          ].join(' ')}
          isInvalid={hasErrors(errors?.fields?.datasets?.[0]?.name) && touchedFields.datasets}
          error={errorsList(errors?.fields?.datasets?.[0]?.name)}
        >
          <EuiFieldText
            placeholder={i18n.translate('customIntegrationsPackage.create.dataset.placeholder', {
              defaultMessage: "Give your integration's dataset a name",
            })}
            value={datasetName}
            onChange={(event) => updateDatasetName(event.target.value)}
            isInvalid={hasErrors(errors?.fields?.datasets?.[0].name) && touchedFields.datasets}
            max={100}
            data-test-subj={
              testSubjects?.datasetName ?? 'customIntegrationsPackageCreateFormDatasetNameInput'
            }
          />
        </EuiFormRow>
      </EuiForm>
      {errors?.general && (
        <>
          <EuiSpacer size="l" />
          <ErrorCallout
            error={errors?.general}
            onRetry={onRetry}
            testSubjects={testSubjects?.errorCallout}
          />
        </>
      )}
    </>
  );
};

const hasErrors = (errors?: IntegrationError[]) => errors && errors.length > 0;

const errorsList = (errors?: IntegrationError[]) => {
  return hasErrors(errors) ? (
    <ul>
      {errors!.map((error, index) => (
        <li key={index}>{error.message}</li>
      ))}
    </ul>
  ) : null;
};
