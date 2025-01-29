/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { errors } from '@elastic/elasticsearch';
import { shallow } from 'enzyme';
import React from 'react';

import { SubmitErrorCallout } from './submit_error_callout';
import {
  ERROR_CONFIGURE_FAILURE,
  ERROR_ELASTICSEARCH_CONNECTION_CONFIGURED,
  ERROR_ENROLL_FAILURE,
  ERROR_KIBANA_CONFIG_FAILURE,
  ERROR_KIBANA_CONFIG_NOT_WRITABLE,
  ERROR_OUTSIDE_PREBOOT_STAGE,
  ERROR_PING_FAILURE,
} from '../common';
import { interactiveSetupMock } from '../server/mocks';

describe('SubmitErrorCallout', () => {
  it('renders unknown errors correctly', async () => {
    const wrapper = shallow(
      <SubmitErrorCallout error={new Error('Unknown error')} defaultTitle="Something went wrong" />
    );

    expect(wrapper).toMatchInlineSnapshot(`
      <EuiCallOut
        color="danger"
        title="Something went wrong"
      >
        Unknown error
      </EuiCallOut>
    `);
  });

  it('renders 403 errors correctly', async () => {
    const wrapper = shallow(
      <SubmitErrorCallout
        error={
          new errors.ResponseError(
            interactiveSetupMock.createApiResponse({
              body: {
                statusCode: 403,
              },
            })
          )
        }
        defaultTitle="Something went wrong"
      />
    );

    expect(wrapper).toMatchInlineSnapshot(`
      <EuiCallOut
        color="danger"
        title={
          <Memo(MemoizedFormattedMessage)
            defaultMessage="Verification required"
            id="interactiveSetup.submitErrorCallout.forbiddenErrorTitle"
          />
        }
      >
        <MemoizedFormattedMessage
          defaultMessage="Retry to configure Elastic."
          id="interactiveSetup.submitErrorCallout.forbiddenErrorDescription"
        />
      </EuiCallOut>
    `);
  });

  it('renders 404 errors correctly', async () => {
    const wrapper = shallow(
      <SubmitErrorCallout
        error={
          new errors.ResponseError(
            interactiveSetupMock.createApiResponse({
              body: {
                statusCode: 404,
              },
            })
          )
        }
        defaultTitle="Something went wrong"
      />
    );

    expect(wrapper).toMatchInlineSnapshot(`
      <EuiCallOut
        color="primary"
        title={
          <Memo(MemoizedFormattedMessage)
            defaultMessage="Elastic is already configured"
            id="interactiveSetup.submitErrorCallout.elasticsearchConnectionConfiguredErrorTitle"
          />
        }
      >
        <EuiButton
          onClick={[Function]}
        >
          <MemoizedFormattedMessage
            defaultMessage="Continue to Kibana"
            id="interactiveSetup.submitErrorCallout.elasticsearchConnectionConfiguredSubmitButton"
          />
        </EuiButton>
      </EuiCallOut>
    `);
  });

  it('renders ERROR_CONFIGURE_FAILURE errors correctly', async () => {
    const wrapper = shallow(
      <SubmitErrorCallout
        error={
          new errors.ResponseError(
            interactiveSetupMock.createApiResponse({
              body: {
                statusCode: 500,
                attributes: { type: ERROR_CONFIGURE_FAILURE },
              },
            })
          )
        }
        defaultTitle="Something went wrong"
      />
    );

    expect(wrapper).toMatchInlineSnapshot(`
      <EuiCallOut
        color="danger"
        title="Something went wrong"
      >
        <MemoizedFormattedMessage
          defaultMessage="Retry or update the {config} file manually."
          id="interactiveSetup.submitErrorCallout.kibanaConfigFailureErrorDescription"
          values={
            Object {
              "config": <strong>
                kibana.yml
              </strong>,
            }
          }
        />
      </EuiCallOut>
    `);
  });

  it('renders ERROR_ELASTICSEARCH_CONNECTION_CONFIGURED errors correctly', async () => {
    const wrapper = shallow(
      <SubmitErrorCallout
        error={
          new errors.ResponseError(
            interactiveSetupMock.createApiResponse({
              body: {
                statusCode: 500,
                attributes: { type: ERROR_ELASTICSEARCH_CONNECTION_CONFIGURED },
              },
            })
          )
        }
        defaultTitle="Something went wrong"
      />
    );

    expect(wrapper).toMatchInlineSnapshot(`
      <EuiCallOut
        color="primary"
        title={
          <Memo(MemoizedFormattedMessage)
            defaultMessage="Elastic is already configured"
            id="interactiveSetup.submitErrorCallout.elasticsearchConnectionConfiguredErrorTitle"
          />
        }
      >
        <EuiButton
          onClick={[Function]}
        >
          <MemoizedFormattedMessage
            defaultMessage="Continue to Kibana"
            id="interactiveSetup.submitErrorCallout.elasticsearchConnectionConfiguredSubmitButton"
          />
        </EuiButton>
      </EuiCallOut>
    `);
  });

  it('renders ERROR_ENROLL_FAILURE errors correctly', async () => {
    const wrapper = shallow(
      <SubmitErrorCallout
        error={
          new errors.ResponseError(
            interactiveSetupMock.createApiResponse({
              body: {
                statusCode: 500,
                attributes: { type: ERROR_ENROLL_FAILURE },
              },
            })
          )
        }
        defaultTitle="Something went wrong"
      />
    );

    expect(wrapper).toMatchInlineSnapshot(`
      <EuiCallOut
        color="danger"
        title="Something went wrong"
      >
        <MemoizedFormattedMessage
          defaultMessage="Generate a new enrollment token or configure manually."
          id="interactiveSetup.submitErrorCallout.EnrollFailureErrorDescription"
        />
      </EuiCallOut>
    `);
  });

  it('renders ERROR_KIBANA_CONFIG_FAILURE errors correctly', async () => {
    const wrapper = shallow(
      <SubmitErrorCallout
        error={
          new errors.ResponseError(
            interactiveSetupMock.createApiResponse({
              body: {
                statusCode: 500,
                attributes: { type: ERROR_KIBANA_CONFIG_FAILURE },
              },
            })
          )
        }
        defaultTitle="Something went wrong"
      />
    );

    expect(wrapper).toMatchInlineSnapshot(`
      <EuiCallOut
        color="danger"
        title={
          <Memo(MemoizedFormattedMessage)
            defaultMessage="Couldn't write to config file"
            id="interactiveSetup.submitErrorCallout.kibanaConfigNotWritableErrorTitle"
          />
        }
      >
        <MemoizedFormattedMessage
          defaultMessage="Retry or update the {config} file manually."
          id="interactiveSetup.submitErrorCallout.kibanaConfigFailureErrorDescription"
          values={
            Object {
              "config": <strong>
                kibana.yml
              </strong>,
            }
          }
        />
      </EuiCallOut>
    `);
  });

  it('renders ERROR_KIBANA_CONFIG_NOT_WRITABLE errors correctly', async () => {
    const wrapper = shallow(
      <SubmitErrorCallout
        error={
          new errors.ResponseError(
            interactiveSetupMock.createApiResponse({
              body: {
                statusCode: 500,
                attributes: { type: ERROR_KIBANA_CONFIG_NOT_WRITABLE },
              },
            })
          )
        }
        defaultTitle="Something went wrong"
      />
    );

    expect(wrapper).toMatchInlineSnapshot(`
      <EuiCallOut
        color="danger"
        title={
          <Memo(MemoizedFormattedMessage)
            defaultMessage="Couldn't write to config file"
            id="interactiveSetup.submitErrorCallout.kibanaConfigNotWritableErrorTitle"
          />
        }
      >
        <MemoizedFormattedMessage
          defaultMessage="Check the file permissions and ensure {config} is writable by the Kibana process."
          id="interactiveSetup.submitErrorCallout.kibanaConfigNotWritableErrorDescription"
          values={
            Object {
              "config": <strong>
                kibana.yml
              </strong>,
            }
          }
        />
      </EuiCallOut>
    `);
  });

  it('renders ERROR_OUTSIDE_PREBOOT_STAGE errors correctly', async () => {
    const wrapper = shallow(
      <SubmitErrorCallout
        error={
          new errors.ResponseError(
            interactiveSetupMock.createApiResponse({
              body: {
                statusCode: 500,
                attributes: { type: ERROR_OUTSIDE_PREBOOT_STAGE },
              },
            })
          )
        }
        defaultTitle="Something went wrong"
      />
    );

    expect(wrapper).toMatchInlineSnapshot(`
      <EuiCallOut
        color="primary"
        title={
          <Memo(MemoizedFormattedMessage)
            defaultMessage="Elastic is already configured"
            id="interactiveSetup.submitErrorCallout.elasticsearchConnectionConfiguredErrorTitle"
          />
        }
      >
        <EuiButton
          onClick={[Function]}
        >
          <MemoizedFormattedMessage
            defaultMessage="Continue to Kibana"
            id="interactiveSetup.submitErrorCallout.elasticsearchConnectionConfiguredSubmitButton"
          />
        </EuiButton>
      </EuiCallOut>
    `);
  });

  it('renders ERROR_PING_FAILURE errors correctly', async () => {
    const wrapper = shallow(
      <SubmitErrorCallout
        error={
          new errors.ResponseError(
            interactiveSetupMock.createApiResponse({
              body: {
                statusCode: 500,
                attributes: { type: ERROR_PING_FAILURE },
              },
            })
          )
        }
        defaultTitle="Something went wrong"
      />
    );

    expect(wrapper).toMatchInlineSnapshot(`
      <EuiCallOut
        color="danger"
        title={
          <Memo(MemoizedFormattedMessage)
            defaultMessage="Couldn't connect to cluster"
            id="interactiveSetup.submitErrorCallout.pingFailureErrorTitle"
          />
        }
      >
        <MemoizedFormattedMessage
          defaultMessage="Check the address and retry."
          id="interactiveSetup.submitErrorCallout.pingFailureErrorDescription"
        />
      </EuiCallOut>
    `);
  });
});
