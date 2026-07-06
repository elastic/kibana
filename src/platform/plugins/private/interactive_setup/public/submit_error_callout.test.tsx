/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { errors } from '@elastic/elasticsearch';
import { screen } from '@testing-library/react';
import React from 'react';

import { renderWithI18n } from '@kbn/test-jest-helpers';

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
    const { container } = renderWithI18n(
      <SubmitErrorCallout error={new Error('Unknown error')} defaultTitle="Something went wrong" />
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Unknown error')).toBeInTheDocument();
    expect(container.children[0]).toMatchInlineSnapshot(`
      <div
        class="euiPanel euiPanel--danger euiPanel--paddingMedium euiCallOut euiCallOut--danger emotion-euiPanel-none-m-danger-euiCallOut"
      >
        <p
          class="euiTitle euiCallOutHeader__title emotion-euiTitle-xs-euiCallOutHeader-danger"
        >
          Something went wrong
        </p>
        <div
          class="euiSpacer euiSpacer--s emotion-euiSpacer-s"
        />
        <div
          class="euiText emotion-euiText-s-euiTextColor-default"
        >
          Unknown error
        </div>
      </div>
    `);
  });

  it('renders 403 errors correctly', async () => {
    const { container } = renderWithI18n(
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

    expect(screen.getByText('Verification required')).toBeInTheDocument();
    expect(screen.getByText('Retry to configure Elastic.')).toBeInTheDocument();
    expect(container.children[0]).toMatchInlineSnapshot(`
      <div
        class="euiPanel euiPanel--danger euiPanel--paddingMedium euiCallOut euiCallOut--danger emotion-euiPanel-none-m-danger-euiCallOut"
      >
        <p
          class="euiTitle euiCallOutHeader__title emotion-euiTitle-xs-euiCallOutHeader-danger"
        >
          Verification required
        </p>
        <div
          class="euiSpacer euiSpacer--s emotion-euiSpacer-s"
        />
        <div
          class="euiText emotion-euiText-s-euiTextColor-default"
        >
          Retry to configure Elastic.
        </div>
      </div>
    `);
  });

  it('renders 404 errors correctly', async () => {
    const { container } = renderWithI18n(
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

    expect(screen.getByText('Elastic is already configured')).toBeInTheDocument();
    expect(screen.getByText('Continue to Kibana')).toBeInTheDocument();
    expect(container.children[0]).toMatchInlineSnapshot(`
      <div
        class="euiPanel euiPanel--primary euiPanel--paddingMedium euiCallOut euiCallOut--primary emotion-euiPanel-none-m-primary-euiCallOut"
      >
        <p
          class="euiTitle euiCallOutHeader__title emotion-euiTitle-xs-euiCallOutHeader-primary"
        >
          Elastic is already configured
        </p>
        <div
          class="euiSpacer euiSpacer--s emotion-euiSpacer-s"
        />
        <div
          class="euiText emotion-euiText-s-euiTextColor-default"
        >
          <button
            class="euiButton emotion-euiButtonDisplay-m-defaultMinWidth-base-primary"
            type="button"
          >
            <span
              class="emotion-euiButtonDisplayContent"
            >
              Continue to Kibana
            </span>
          </button>
        </div>
        <div
          aria-atomic="true"
          aria-live="polite"
          class="emotion-euiScreenReaderOnly"
          role="status"
        />
      </div>
    `);
  });

  it('renders ERROR_CONFIGURE_FAILURE errors correctly', async () => {
    const { container } = renderWithI18n(
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

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/Retry or update the/)).toBeInTheDocument();
    expect(screen.getByText('kibana.yml')).toBeInTheDocument();
    expect(container.children[0]).toMatchInlineSnapshot(`
      <div
        class="euiPanel euiPanel--danger euiPanel--paddingMedium euiCallOut euiCallOut--danger emotion-euiPanel-none-m-danger-euiCallOut"
      >
        <p
          class="euiTitle euiCallOutHeader__title emotion-euiTitle-xs-euiCallOutHeader-danger"
        >
          Something went wrong
        </p>
        <div
          class="euiSpacer euiSpacer--s emotion-euiSpacer-s"
        />
        <div
          class="euiText emotion-euiText-s-euiTextColor-default"
        >
          Retry or update the 
          <strong>
            kibana.yml
          </strong>
           file manually.
        </div>
      </div>
    `);
  });

  it('renders ERROR_ELASTICSEARCH_CONNECTION_CONFIGURED errors correctly', async () => {
    const { container } = renderWithI18n(
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

    expect(screen.getByText('Elastic is already configured')).toBeInTheDocument();
    expect(screen.getByText('Continue to Kibana')).toBeInTheDocument();
    expect(container.children[0]).toMatchInlineSnapshot(`
      <div
        class="euiPanel euiPanel--primary euiPanel--paddingMedium euiCallOut euiCallOut--primary emotion-euiPanel-none-m-primary-euiCallOut"
      >
        <p
          class="euiTitle euiCallOutHeader__title emotion-euiTitle-xs-euiCallOutHeader-primary"
        >
          Elastic is already configured
        </p>
        <div
          class="euiSpacer euiSpacer--s emotion-euiSpacer-s"
        />
        <div
          class="euiText emotion-euiText-s-euiTextColor-default"
        >
          <button
            class="euiButton emotion-euiButtonDisplay-m-defaultMinWidth-base-primary"
            type="button"
          >
            <span
              class="emotion-euiButtonDisplayContent"
            >
              Continue to Kibana
            </span>
          </button>
        </div>
        <div
          aria-atomic="true"
          aria-live="polite"
          class="emotion-euiScreenReaderOnly"
          role="status"
        />
      </div>
    `);
  });

  it('renders ERROR_ENROLL_FAILURE errors correctly', async () => {
    const { container } = renderWithI18n(
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

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(
      screen.getByText('Generate a new enrollment token or configure manually.')
    ).toBeInTheDocument();
    expect(container.children[0]).toMatchInlineSnapshot(`
      <div
        class="euiPanel euiPanel--danger euiPanel--paddingMedium euiCallOut euiCallOut--danger emotion-euiPanel-none-m-danger-euiCallOut"
      >
        <p
          class="euiTitle euiCallOutHeader__title emotion-euiTitle-xs-euiCallOutHeader-danger"
        >
          Something went wrong
        </p>
        <div
          class="euiSpacer euiSpacer--s emotion-euiSpacer-s"
        />
        <div
          class="euiText emotion-euiText-s-euiTextColor-default"
        >
          Generate a new enrollment token or configure manually.
        </div>
      </div>
    `);
  });

  it('renders ERROR_KIBANA_CONFIG_FAILURE errors correctly', async () => {
    const { container } = renderWithI18n(
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

    expect(screen.getByText("Couldn't write to config file")).toBeInTheDocument();
    expect(screen.getByText(/Retry or update the/)).toBeInTheDocument();
    expect(container.children[0]).toMatchInlineSnapshot(`
      <div
        class="euiPanel euiPanel--danger euiPanel--paddingMedium euiCallOut euiCallOut--danger emotion-euiPanel-none-m-danger-euiCallOut"
      >
        <p
          class="euiTitle euiCallOutHeader__title emotion-euiTitle-xs-euiCallOutHeader-danger"
        >
          Couldn't write to config file
        </p>
        <div
          class="euiSpacer euiSpacer--s emotion-euiSpacer-s"
        />
        <div
          class="euiText emotion-euiText-s-euiTextColor-default"
        >
          Retry or update the 
          <strong>
            kibana.yml
          </strong>
           file manually.
        </div>
      </div>
    `);
  });

  it('renders ERROR_KIBANA_CONFIG_NOT_WRITABLE errors correctly', async () => {
    const { container } = renderWithI18n(
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

    expect(screen.getByText("Couldn't write to config file")).toBeInTheDocument();
    expect(screen.getByText(/Check the file permissions/)).toBeInTheDocument();
    expect(container.children[0]).toMatchInlineSnapshot(`
      <div
        class="euiPanel euiPanel--danger euiPanel--paddingMedium euiCallOut euiCallOut--danger emotion-euiPanel-none-m-danger-euiCallOut"
      >
        <p
          class="euiTitle euiCallOutHeader__title emotion-euiTitle-xs-euiCallOutHeader-danger"
        >
          Couldn't write to config file
        </p>
        <div
          class="euiSpacer euiSpacer--s emotion-euiSpacer-s"
        />
        <div
          class="euiText emotion-euiText-s-euiTextColor-default"
        >
          Check the file permissions and ensure 
          <strong>
            kibana.yml
          </strong>
           is writable by the Kibana process.
        </div>
      </div>
    `);
  });

  it('renders ERROR_OUTSIDE_PREBOOT_STAGE errors correctly', async () => {
    const { container } = renderWithI18n(
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

    expect(screen.getByText('Elastic is already configured')).toBeInTheDocument();
    expect(screen.getByText('Continue to Kibana')).toBeInTheDocument();
    expect(container.children[0]).toMatchInlineSnapshot(`
      <div
        class="euiPanel euiPanel--primary euiPanel--paddingMedium euiCallOut euiCallOut--primary emotion-euiPanel-none-m-primary-euiCallOut"
      >
        <p
          class="euiTitle euiCallOutHeader__title emotion-euiTitle-xs-euiCallOutHeader-primary"
        >
          Elastic is already configured
        </p>
        <div
          class="euiSpacer euiSpacer--s emotion-euiSpacer-s"
        />
        <div
          class="euiText emotion-euiText-s-euiTextColor-default"
        >
          <button
            class="euiButton emotion-euiButtonDisplay-m-defaultMinWidth-base-primary"
            type="button"
          >
            <span
              class="emotion-euiButtonDisplayContent"
            >
              Continue to Kibana
            </span>
          </button>
        </div>
        <div
          aria-atomic="true"
          aria-live="polite"
          class="emotion-euiScreenReaderOnly"
          role="status"
        />
      </div>
    `);
  });

  it('renders ERROR_PING_FAILURE errors correctly', async () => {
    const { container } = renderWithI18n(
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

    expect(screen.getByText("Couldn't connect to cluster")).toBeInTheDocument();
    expect(screen.getByText('Check the address and retry.')).toBeInTheDocument();
    expect(container.children[0]).toMatchInlineSnapshot(`
      <div
        class="euiPanel euiPanel--danger euiPanel--paddingMedium euiCallOut euiCallOut--danger emotion-euiPanel-none-m-danger-euiCallOut"
      >
        <p
          class="euiTitle euiCallOutHeader__title emotion-euiTitle-xs-euiCallOutHeader-danger"
        >
          Couldn't connect to cluster
        </p>
        <div
          class="euiSpacer euiSpacer--s emotion-euiSpacer-s"
        />
        <div
          class="euiText emotion-euiText-s-euiTextColor-default"
        >
          Check the address and retry.
        </div>
      </div>
    `);
  });
});
