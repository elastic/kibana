/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { EuiEmptyPrompt, EuiLink, EuiText } from '@elastic/eui';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import { HealthCheckErrors, healthCheckErrors } from '@kbn/alerts-ui-shared/src/common/apis';

import {
  HEALTH_CHECK_ALERTS_ERROR_TITLE,
  HEALTH_CHECK_ALERTS_ERROR_TEXT,
  HEALTH_CHECK_ENCRYPTION_ERROR_TITLE,
  HEALTH_CHECK_ENCRYPTION_ERROR_TEXT,
  HEALTH_CHECK_API_KEY_ENCRYPTION_ERROR_TITLE,
  HEALTH_CHECK_API_KEY_ENCRYPTION_ERROR_TEXT,
  HEALTH_CHECK_API_KEY_DISABLED_ERROR_TITLE,
  HEALTH_CHECK_API_KEY_DISABLED_ERROR_TEXT,
  HEALTH_CHECK_ACTION_TEXT,
} from '../translations';

export interface RuleFormHealthCheckErrorProps {
  error: HealthCheckErrors;
  docLinks: DocLinksStart;
}

export const RuleFormHealthCheckError = (props: RuleFormHealthCheckErrorProps) => {
  const { error, docLinks } = props;

  const errorState = useMemo(() => {
    if (error === healthCheckErrors.ALERTS_ERROR) {
      return {
        errorTitle: HEALTH_CHECK_ALERTS_ERROR_TITLE,
        errorBodyText: HEALTH_CHECK_ALERTS_ERROR_TEXT,
        errorDocLink: docLinks.links.alerting.generalSettings,
      };
    }
    if (error === healthCheckErrors.ENCRYPTION_ERROR) {
      return {
        errorTitle: HEALTH_CHECK_ENCRYPTION_ERROR_TITLE,
        errorBodyText: HEALTH_CHECK_ENCRYPTION_ERROR_TEXT,
        errorDocLink: docLinks.links.alerting.generalSettings,
      };
    }
    if (error === healthCheckErrors.API_KEYS_AND_ENCRYPTION_ERROR) {
      return {
        errorTitle: HEALTH_CHECK_API_KEY_ENCRYPTION_ERROR_TITLE,
        errorBodyText: HEALTH_CHECK_API_KEY_ENCRYPTION_ERROR_TEXT,
        errorDocLink: docLinks.links.alerting.setupPrerequisites,
      };
    }
    if (error === healthCheckErrors.API_KEYS_DISABLED_ERROR) {
      return {
        errorTitle: HEALTH_CHECK_API_KEY_DISABLED_ERROR_TITLE,
        errorBodyText: HEALTH_CHECK_API_KEY_DISABLED_ERROR_TEXT,
        errorDocLink: docLinks.links.security.elasticsearchEnableApiKeys,
      };
    }
  }, [error, docLinks]);

  if (!errorState) {
    return null;
  }

  return (
    <EuiEmptyPrompt
      data-test-subj="ruleFormHealthCheckError"
      iconType="watchesApp"
      titleSize="xs"
      title={
        <EuiText color="default">
          <h2>{errorState.errorTitle}</h2>
        </EuiText>
      }
      body={
        <div>
          <p role="banner">
            {errorState.errorBodyText}&nbsp;
            <EuiLink
              data-test-subj="ruleFormHealthCheckErrorLink"
              external
              href={errorState.errorDocLink}
              target="_blank"
            >
              {HEALTH_CHECK_ACTION_TEXT}
            </EuiLink>
          </p>
        </div>
      }
    />
  );
};
