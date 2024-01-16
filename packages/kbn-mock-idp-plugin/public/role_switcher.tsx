/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FunctionComponent, useEffect, useState } from 'react';
import { EuiButton, EuiPopover, EuiContextMenu } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { CoreStart } from '@kbn/core-lifecycle-browser';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import type { AuthenticatedUser } from '@kbn/security-plugin-types-common';
import {
  MOCK_IDP_REALM_NAME,
  MOCK_IDP_REALM_TYPE,
  MOCK_IDP_SECURITY_ROLE_NAMES,
  MOCK_IDP_OBSERVABILITY_ROLE_NAMES,
  MOCK_IDP_SEARCH_ROLE_NAMES,
} from '@kbn/mock-idp-utils/src/constants';
import { createReloadPageToast } from './reload_page_toast';
import type { CreateSAMLResponseParams } from '../server';

const useCurrentUser = () => {
  const { services } = useKibana<CoreStart>();
  return useAsyncFn(() => services.http.get<AuthenticatedUser>('/internal/security/me'));
};

export const useAuthenticator = (reloadPage = false) => {
  const { services } = useKibana<CoreStart>();

  return useAsyncFn(async (params: CreateSAMLResponseParams) => {
    // Create SAML Response using Mock IDP
    const response = await services.http.post<Record<string, string>>('/mock_idp/saml_response', {
      body: JSON.stringify(params),
    });

    // Authenticate user with SAML response
    if (reloadPage) {
      const form = createForm('/api/security/saml/callback', response);
      form.submit();
      await new Promise(() => {}); // Never resolve
    } else {
      await services.http.post('/api/security/saml/callback', {
        body: JSON.stringify(response),
        asResponse: true,
        rawResponse: true,
      });
    }

    return params;
  });
};

export interface RoleSwitcherProps {
  projectType?: string;
}

export const RoleSwitcher: FunctionComponent<RoleSwitcherProps> = ({ projectType }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { services } = useKibana<CoreStart>();
  const [currentUserState, getCurrentUser] = useCurrentUser();
  const [authenticateUserState, authenticateUser] = useAuthenticator();

  useEffect(() => {
    getCurrentUser();
  }, [getCurrentUser, authenticateUserState.value]);

  useEffect(() => {
    if (authenticateUserState.value) {
      services.notifications.toasts.add(
        createReloadPageToast({
          user: authenticateUserState.value,
          theme: services.theme,
          i18n: services.i18n,
        })
      );
    }
  }, [authenticateUserState.value]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!currentUserState.value || !isAuthenticatedWithMockIDP(currentUserState.value)) {
    return null;
  }

  const [currentRole] = currentUserState.value.roles;

  const roles =
    projectType === 'security'
      ? MOCK_IDP_SECURITY_ROLE_NAMES
      : projectType === 'observability'
      ? MOCK_IDP_OBSERVABILITY_ROLE_NAMES
      : MOCK_IDP_SEARCH_ROLE_NAMES;

  return (
    <EuiPopover
      button={
        <EuiButton
          color="text"
          size="s"
          iconType="arrowDown"
          iconSide="right"
          minWidth={false}
          onClick={() => setIsOpen((toggle) => !toggle)}
          isLoading={currentUserState.loading || authenticateUserState.loading}
        >
          {currentRole}
        </EuiButton>
      }
      panelPaddingSize="none"
      offset={4}
      anchorPosition="downRight"
      repositionOnScroll
      repositionToCrossAxis={false}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
    >
      <EuiContextMenu
        initialPanelId={0}
        panels={[
          {
            id: 0,
            title: 'Switch role',
            items: roles.map((role) => ({
              name: role,
              icon: currentUserState.value!.roles.includes(role) ? 'check' : 'empty',
              onClick: () => {
                authenticateUser({
                  username: currentUserState.value!.username,
                  full_name: currentUserState.value!.full_name,
                  email: currentUserState.value!.email,
                  roles: [role],
                });
                setIsOpen(false);
              },
            })),
          },
        ]}
      />
    </EuiPopover>
  );
};

function isAuthenticatedWithMockIDP(user: AuthenticatedUser) {
  return (
    user.authentication_provider.type === MOCK_IDP_REALM_TYPE &&
    user.authentication_provider.name === MOCK_IDP_REALM_NAME
  );
}

const createForm = (url: string, fields: Record<string, string>) => {
  const form = document.createElement('form');
  form.setAttribute('method', 'post');
  form.setAttribute('action', url);

  for (const key in fields) {
    if (!fields.hasOwnProperty(key)) {
      continue;
    }
    const input = document.createElement('input');
    input.setAttribute('type', 'hidden');
    input.setAttribute('name', key);
    input.setAttribute('value', fields[key]);
    form.appendChild(input);
  }

  return document.body.appendChild(form);
};
