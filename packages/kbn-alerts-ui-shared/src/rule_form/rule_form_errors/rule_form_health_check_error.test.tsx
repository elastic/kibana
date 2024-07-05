/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import { render, screen } from '@testing-library/react';
import { RuleFormHealthCheckError } from './rule_form_health_check_error';
import { HealthCheckErrors, healthCheckErrors } from '../../common/apis';
import {
  HEALTH_CHECK_ALERTS_ERROR_TEXT,
  HEALTH_CHECK_ENCRYPTION_ERROR_TEXT,
  HEALTH_CHECK_API_KEY_ENCRYPTION_ERROR_TEXT,
  HEALTH_CHECK_API_KEY_DISABLED_ERROR_TEXT,
  HEALTH_CHECK_ALERTS_ERROR_TITLE,
  HEALTH_CHECK_API_KEY_DISABLED_ERROR_TITLE,
  HEALTH_CHECK_API_KEY_ENCRYPTION_ERROR_TITLE,
  HEALTH_CHECK_ENCRYPTION_ERROR_TITLE,
} from '../translations';

const docLinksMock = {
  links: {
    alerting: {
      generalSettings: 'generalSettings',
      setupPrerequisites: 'setupPrerequisites',
    },
    security: {
      elasticsearchEnableApiKeys: 'elasticsearchEnableApiKeys',
    },
  },
} as DocLinksStart;

describe('ruleFormHealthCheckError', () => {
  test('renders correctly', () => {
    render(
      <RuleFormHealthCheckError error={healthCheckErrors.ALERTS_ERROR} docLinks={docLinksMock} />
    );

    expect(screen.getByTestId('ruleFormHealthCheckError')).toBeInTheDocument();
  });

  test('renders alerts error', () => {
    render(
      <RuleFormHealthCheckError error={healthCheckErrors.ALERTS_ERROR} docLinks={docLinksMock} />
    );
    expect(screen.getByText(HEALTH_CHECK_ALERTS_ERROR_TITLE)).toBeInTheDocument();
    expect(screen.getByText(HEALTH_CHECK_ALERTS_ERROR_TEXT)).toBeInTheDocument();
    expect(screen.getByTestId('ruleFormHealthCheckErrorLink')).toHaveAttribute(
      'href',
      'generalSettings'
    );
  });

  test('renders encryption error', () => {
    render(
      <RuleFormHealthCheckError
        error={healthCheckErrors.ENCRYPTION_ERROR}
        docLinks={docLinksMock}
      />
    );

    expect(screen.getByText(HEALTH_CHECK_ENCRYPTION_ERROR_TEXT)).toBeInTheDocument();
    expect(screen.getByText(HEALTH_CHECK_ENCRYPTION_ERROR_TITLE)).toBeInTheDocument();
    expect(screen.getByTestId('ruleFormHealthCheckErrorLink')).toHaveAttribute(
      'href',
      'generalSettings'
    );
  });

  test('renders API keys and encryption error', () => {
    render(
      <RuleFormHealthCheckError
        error={healthCheckErrors.API_KEYS_AND_ENCRYPTION_ERROR}
        docLinks={docLinksMock}
      />
    );

    expect(screen.getByText(HEALTH_CHECK_API_KEY_ENCRYPTION_ERROR_TEXT)).toBeInTheDocument();
    expect(screen.getByText(HEALTH_CHECK_API_KEY_ENCRYPTION_ERROR_TITLE)).toBeInTheDocument();
    expect(screen.getByTestId('ruleFormHealthCheckErrorLink')).toHaveAttribute(
      'href',
      'setupPrerequisites'
    );
  });

  test('renders API keys disabled error', () => {
    render(
      <RuleFormHealthCheckError
        error={healthCheckErrors.API_KEYS_DISABLED_ERROR}
        docLinks={docLinksMock}
      />
    );

    expect(screen.getByText(HEALTH_CHECK_API_KEY_DISABLED_ERROR_TEXT)).toBeInTheDocument();
    expect(screen.getByText(HEALTH_CHECK_API_KEY_DISABLED_ERROR_TITLE)).toBeInTheDocument();
    expect(screen.getByTestId('ruleFormHealthCheckErrorLink')).toHaveAttribute(
      'href',
      'elasticsearchEnableApiKeys'
    );
  });

  test('should not render if unknown error is passed in', () => {
    render(
      <RuleFormHealthCheckError
        error={'unknown error' as HealthCheckErrors}
        docLinks={docLinksMock}
      />
    );

    expect(screen.queryByTestId('ruleFormHealthCheckError')).not.toBeInTheDocument();
  });
});
