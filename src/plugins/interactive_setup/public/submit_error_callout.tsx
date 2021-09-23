/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiButton, EuiCallOut } from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import type { IHttpFetchError } from 'kibana/public';

export interface SubmitErrorCalloutProps {
  error: Error;
  defaultTitle: React.ReactNode;
}

export const SubmitErrorCallout: FunctionComponent<SubmitErrorCalloutProps> = (props) => {
  const error = props.error as IHttpFetchError;

  if (
    error.body?.attributes?.type === 'outside_preboot_stage' ||
    error.body?.attributes?.type === 'elasticsearch_connection_configured'
  ) {
    return (
      <EuiCallOut
        color="primary"
        title={i18n.translate(
          'interactiveSetup.submitErrorCallout.elasticsearchConnectionConfiguredErrorTitle',
          {
            defaultMessage: 'Elastic is already configured',
          }
        )}
      >
        <EuiButton>
          <FormattedMessage
            id="interactiveSetup.submitErrorCallout.elasticsearchConnectionConfiguredSubmitButton"
            defaultMessage="Continue to Elastic"
          />
        </EuiButton>
      </EuiCallOut>
    );
  }

  return (
    <EuiCallOut
      color="danger"
      title={
        error.body?.attributes?.type === 'kibana_config_not_writable'
          ? i18n.translate(
              'interactiveSetup.submitErrorCallout.kibanaConfigNotWritableErrorTitle',
              {
                defaultMessage: 'Config file is not writable',
              }
            )
          : error.body?.attributes?.type === 'kibana_config_failure'
          ? i18n.translate('interactiveSetup.submitErrorCallout.kibanaConfigFailureErrorTitle', {
              defaultMessage: "Couldn't write to config file",
            })
          : error.body?.attributes?.type === 'enroll_failure'
          ? i18n.translate('interactiveSetup.submitErrorCallout.EnrollFailureErrorTitle', {
              defaultMessage: "Couldn't enroll with cluster",
            })
          : error.body?.attributes?.type === 'configure_failure'
          ? i18n.translate('interactiveSetup.submitErrorCallout.configureFailureErrorTitle', {
              defaultMessage: "Couldn't configure Kibana",
            })
          : error.body?.attributes?.type === 'ping_failure'
          ? i18n.translate('interactiveSetup.submitErrorCallout.pingFailureErrorTitle', {
              defaultMessage: "Couldn't connect to cluster",
            })
          : props.defaultTitle
      }
    >
      {error.body?.attributes?.type === 'kibana_config_not_writable' ? (
        <FormattedMessage
          id="interactiveSetup.submitErrorCallout.kibanaConfigNotWritableErrorDescription"
          defaultMessage="Check {config} file permissions and ensure Kibana process can write to it."
          values={{
            config: <strong>kibana.yml</strong>,
          }}
        />
      ) : error.body?.attributes?.type === 'kibana_config_failure' ? (
        <FormattedMessage
          id="interactiveSetup.submitErrorCallout.kibanaConfigFailureErrorDescription"
          defaultMessage="Retry or update {config} file manually."
          values={{
            config: <strong>kibana.yml</strong>,
          }}
        />
      ) : error.body?.attributes?.type === 'enroll_failure' ? (
        <FormattedMessage
          id="interactiveSetup.submitErrorCallout.EnrollFailureErrorDescription"
          defaultMessage="Generate a new enrollment token or configure manually."
        />
      ) : error.body?.attributes?.type === 'configure_failure' ? (
        <FormattedMessage
          id="interactiveSetup.submitErrorCallout.configureFailureErrorDescription"
          defaultMessage="Retry or update {config} file manually."
          values={{
            config: <strong>kibana.yml</strong>,
          }}
        />
      ) : error.body?.attributes?.type === 'ping_failure' ? (
        <FormattedMessage
          id="interactiveSetup.submitErrorCallout.pingFailureErrorDescription"
          defaultMessage="Check address and retry."
        />
      ) : (
        error.body?.message || error.message
      )}
    </EuiCallOut>
  );
};
