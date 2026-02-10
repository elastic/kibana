/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiButton, EuiCallOut, EuiSpacer } from '@elastic/eui';
import { useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { z } from '@kbn/zod/v4';
import type { BaseWidgetProps } from '../types';

type OAuthAuthorizeButtonWidgetProps = BaseWidgetProps<z.ZodBoolean>;

function getOAuthStatusFromLocation(): 'success' | 'error' | null {
  const params = new URLSearchParams(window.location.search);
  const v = params.get('oauth_authorization');
  if (v === 'success') return 'success';
  if (v === 'error') return 'error';
  return null;
}

function removeOAuthStatusFromUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete('oauth_authorization');
  window.history.replaceState({}, document.title, url.toString());
}

export const OAuthAuthorizeButtonWidget: React.FC<OAuthAuthorizeButtonWidgetProps> = ({
  fieldConfig,
  formConfig,
}) => {
  const { services } = useKibana<{
    http: { post: (path: string, options?: { body?: string }) => Promise<any> };
    notifications?: { toasts?: { addDanger: (m: { title: string; text?: string }) => void } };
  }>();

  const [formData] = useFormData();
  const [isLoading, setIsLoading] = useState(false);

  const oauthStatus = useMemo(() => getOAuthStatusFromLocation(), []);

  useEffect(() => {
    if (oauthStatus) {
      // keep the page clean after displaying status once
      removeOAuthStatusFromUrl();
    }
  }, [oauthStatus]);

  const connectorId: string | undefined = formData?.id;
  const canAuthorize = Boolean(formConfig.isEdit && connectorId && !formConfig.disabled);

  const onAuthorize = useCallback(async () => {
    if (!connectorId) return;
    setIsLoading(true);
    try {
      const kibanaReturnUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const result = await services.http.post(
        `/api/actions/connector/${connectorId}/_start_oauth_flow`,
        {
          body: JSON.stringify({ kibanaReturnUrl }),
        }
      );

      const authorizationUrl = result?.authorizationUrl;
      if (typeof authorizationUrl !== 'string' || authorizationUrl.length === 0) {
        throw new Error('Missing authorizationUrl from server response');
      }

      // Start OAuth flow in the current tab.
      window.location.assign(authorizationUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      services.notifications?.toasts?.addDanger({
        title: 'OAuth authorization failed',
        text: message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [connectorId, services.http, services.notifications]);

  return (
    <>
      {oauthStatus === 'success' && (
        <>
          <EuiCallOut title="Authorization successful" color="success" iconType="check" />
          <EuiSpacer size="m" />
        </>
      )}
      {oauthStatus === 'error' && (
        <>
          <EuiCallOut
            title="Authorization failed"
            color="danger"
            iconType="warning"
            data-test-subj="oauthAuthorizationFailed"
          />
          <EuiSpacer size="m" />
        </>
      )}

      {!formConfig.isEdit && (
        <>
          <EuiCallOut
            title="Save connector to authorize"
            color="warning"
            iconType="iInCircle"
            data-test-subj="oauthSaveBeforeAuthorize"
          >
            {fieldConfig?.helpText as string}
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}

      <EuiButton
        isLoading={isLoading}
        isDisabled={!canAuthorize}
        onClick={onAuthorize}
        data-test-subj="oauthAuthorizeButton"
      >
        {String(fieldConfig?.label ?? 'Authorize')}
      </EuiButton>
      <EuiSpacer size="m" />
    </>
  );
};

