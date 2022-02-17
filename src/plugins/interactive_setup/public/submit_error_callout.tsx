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

import { FormattedMessage } from '@kbn/i18n-react';
import type { IHttpFetchError, ResponseErrorBody } from 'kibana/public';

import {
  ERROR_COMPATIBILITY_FAILURE,
  ERROR_CONFIGURE_FAILURE,
  ERROR_ELASTICSEARCH_CONNECTION_CONFIGURED,
  ERROR_ENROLL_FAILURE,
  ERROR_KIBANA_CONFIG_FAILURE,
  ERROR_KIBANA_CONFIG_NOT_WRITABLE,
  ERROR_OUTSIDE_PREBOOT_STAGE,
  ERROR_PING_FAILURE,
} from '../common';

export interface SubmitErrorCalloutProps {
  error: Error;
  defaultTitle: React.ReactNode;
}

export const SubmitErrorCallout: FunctionComponent<SubmitErrorCalloutProps> = (props) => {
  const error = props.error as IHttpFetchError<ResponseErrorBody>;

  if (
    error.body?.statusCode === 404 ||
    error.body?.attributes?.type === ERROR_OUTSIDE_PREBOOT_STAGE ||
    error.body?.attributes?.type === ERROR_ELASTICSEARCH_CONNECTION_CONFIGURED
  ) {
    return (
      <EuiCallOut
        color="primary"
        title={
          <FormattedMessage
            id="interactiveSetup.submitErrorCallout.elasticsearchConnectionConfiguredErrorTitle"
            defaultMessage="Elastic is already configured"
          />
        }
      >
        <EuiButton
          onClick={() => {
            const url = new URL(window.location.href);
            url.searchParams.delete('code');
            window.location.replace(url.href);
          }}
        >
          <FormattedMessage
            id="interactiveSetup.submitErrorCallout.elasticsearchConnectionConfiguredSubmitButton"
            defaultMessage="Continue to Kibana"
          />
        </EuiButton>
      </EuiCallOut>
    );
  }

  return (
    <EuiCallOut
      color="danger"
      title={
        error.body?.statusCode === 403 ? (
          <FormattedMessage
            id="interactiveSetup.submitErrorCallout.forbiddenErrorTitle"
            defaultMessage="Verification required"
          />
        ) : error.body?.attributes?.type === ERROR_KIBANA_CONFIG_NOT_WRITABLE ||
          error.body?.attributes?.type === ERROR_KIBANA_CONFIG_FAILURE ? (
          <FormattedMessage
            id="interactiveSetup.submitErrorCallout.kibanaConfigNotWritableErrorTitle"
            defaultMessage="Couldn't write to config file"
          />
        ) : error.body?.attributes?.type === ERROR_PING_FAILURE ? (
          <FormattedMessage
            id="interactiveSetup.submitErrorCallout.pingFailureErrorTitle"
            defaultMessage="Couldn't connect to cluster"
          />
        ) : (
          props.defaultTitle
        )
      }
    >
      {error.body?.statusCode === 403 ? (
        <FormattedMessage
          id="interactiveSetup.submitErrorCallout.forbiddenErrorDescription"
          defaultMessage="Retry to configure Elastic."
        />
      ) : error.body?.attributes?.type === ERROR_KIBANA_CONFIG_NOT_WRITABLE ? (
        <FormattedMessage
          id="interactiveSetup.submitErrorCallout.kibanaConfigNotWritableErrorDescription"
          defaultMessage="Check the file permissions and ensure {config} is writable by the Kibana process."
          values={{
            config: <strong>kibana.yml</strong>,
          }}
        />
      ) : error.body?.attributes?.type === ERROR_KIBANA_CONFIG_FAILURE ||
        error.body?.attributes?.type === ERROR_CONFIGURE_FAILURE ? (
        <FormattedMessage
          id="interactiveSetup.submitErrorCallout.kibanaConfigFailureErrorDescription"
          defaultMessage="Retry or update the {config} file manually."
          values={{
            config: <strong>kibana.yml</strong>,
          }}
        />
      ) : error.body?.attributes?.type === ERROR_ENROLL_FAILURE ? (
        <FormattedMessage
          id="interactiveSetup.submitErrorCallout.EnrollFailureErrorDescription"
          defaultMessage="Generate a new enrollment token or configure manually."
        />
      ) : error.body?.attributes?.type === ERROR_PING_FAILURE ? (
        <FormattedMessage
          id="interactiveSetup.submitErrorCallout.pingFailureErrorDescription"
          defaultMessage="Check the address and retry."
        />
      ) : error.body?.attributes?.type === ERROR_COMPATIBILITY_FAILURE ? (
        <FormattedMessage
          id="interactiveSetup.submitErrorCallout.compatibilityFailureErrorDescription"
          defaultMessage="The Elasticsearch cluster (v{elasticsearchVersion}) is incompatible with this version of Kibana (v{kibanaVersion})."
          values={{
            elasticsearchVersion: error.body?.attributes?.elasticsearchVersion as string,
            kibanaVersion: error.body?.attributes?.kibanaVersion as string,
          }}
        />
      ) : (
        error.body?.message || error.message
      )}
    </EuiCallOut>
  );
};
