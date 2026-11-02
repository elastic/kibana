/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadge, EuiContextMenu, EuiPopover, EuiTextTruncate } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import useAsyncFn from 'react-use/lib/useAsyncFn';

import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { MOCK_IDP_REALM_NAME, MOCK_IDP_REALM_TYPE } from '@kbn/mock-idp-utils/src/constants';
import type { AuthenticatedUser } from '@kbn/security-plugin-types-common';

import { createReloadPageToast } from './reload_page_toast';
import type { CreateSAMLResponseParams } from '../server';

export const DATA_TEST_SUBJ_ROLE_SWITCHER_BUTTON = 'mockIdpRoleSwitcherButton';

const useCurrentUser = () => {
  const { services } = useKibana<CoreStart>();
  return useAsyncFn(() => services.http.get<AuthenticatedUser>('/internal/security/me'));
};

export const useAuthenticator = (reloadPage = false) => {
  const { services } = useKibana<CoreStart>();

  return useAsyncFn(async (params: CreateSAMLResponseParams) => {
    const response = await services.http.post<Record<string, string>>('/mock_idp/saml_response', {
      body: JSON.stringify(params),
    });

    const { acsUrl, ...samlFields } = response;
    const formAction = acsUrl ?? services.http.basePath.prepend('/api/security/saml/callback');

    if (reloadPage || acsUrl) {
      const form = createForm(formAction, samlFields);
      form.submit();
      await new Promise(() => {});
    } else {
      await services.http.post('/api/security/saml/callback', {
        body: JSON.stringify(samlFields),
        asResponse: true,
        rawResponse: true,
      });
    }

    return params;
  });
};

const switchRoleAriaLabel = i18n.translate('kbnMockIdpPlugin.roleSwitcher.popoverAriaLabel', {
  defaultMessage: 'Switch role',
});

const ROLE_LABEL_WIDTH = 40;

/** Dev-only mock IDP control that lets the current user switch roles. */
export const RoleSwitcher = (): React.JSX.Element | null => {
  const [isOpen, setIsOpen] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const [currentUserState, getCurrentUser] = useCurrentUser();
  const [authenticateUserState, authenticateUser] = useAuthenticator();
  const { services } = useKibana<CoreStart>();

  useEffect(() => {
    getCurrentUser();
    services.http
      .get<{ roles: string[] }>('/mock_idp/supported_roles')
      .then((response) => setRoles(response.roles));
  }, [getCurrentUser, authenticateUserState.value, services]);

  useEffect(() => {
    if (authenticateUserState.value) {
      services.notifications.toasts.add(
        createReloadPageToast({
          user: authenticateUserState.value,
        })
      );
    }
  }, [authenticateUserState.value]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentUser = currentUserState.value;
  if (!currentUser || !isAuthenticatedWithMockIDP(currentUser) || roles.length === 0) {
    return null;
  }

  const [currentRole] = currentUser.roles;
  const isLoading = currentUserState.loading || authenticateUserState.loading;

  return (
    <EuiPopover
      button={
        <EuiBadge
          color="#0B1628"
          iconType="user"
          iconSide="left"
          onClick={() => setIsOpen((toggle) => !toggle)}
          onClickAriaLabel={switchRoleAriaLabel}
          isDisabled={isLoading}
          data-test-subj={DATA_TEST_SUBJ_ROLE_SWITCHER_BUTTON}
        >
          <EuiTextTruncate text={currentRole} width={ROLE_LABEL_WIDTH} />
        </EuiBadge>
      }
      panelPaddingSize="none"
      offset={4}
      anchorPosition="upRight"
      repositionOnScroll
      repositionToCrossAxis={false}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      aria-label={switchRoleAriaLabel}
    >
      <EuiContextMenu
        initialPanelId={0}
        panels={[
          {
            id: 0,
            title: switchRoleAriaLabel,
            items: roles.map((role) => ({
              name: role,
              icon: currentUser.roles.includes(role) ? 'check' : 'empty',
              onClick: () => {
                authenticateUser({
                  username: currentUser.username,
                  full_name: currentUser.full_name,
                  email: currentUser.email,
                  roles: [role],
                  url: window.location.href,
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
    if (!Object.hasOwn(fields, key)) {
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
