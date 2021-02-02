/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiButton,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

interface HeaderProps {
  canEdit: boolean;
  canDelete: boolean;
  canViewInApp: boolean;
  type: string;
  viewUrl: string;
  onDeleteClick: () => void;
}

export const Header = ({
  canEdit,
  canDelete,
  canViewInApp,
  type,
  viewUrl,
  onDeleteClick,
}: HeaderProps) => {
  return (
    <EuiPageContentHeader>
      <EuiPageContentHeaderSection>
        <EuiTitle>
          {canEdit ? (
            <h1>
              <FormattedMessage
                id="savedObjectsManagement.view.editItemTitle"
                defaultMessage="Edit {title}"
                values={{ title: type }}
              />
            </h1>
          ) : (
            <h1>
              <FormattedMessage
                id="savedObjectsManagement.view.viewItemTitle"
                defaultMessage="View {title}"
                values={{ title: type }}
              />
            </h1>
          )}
        </EuiTitle>
      </EuiPageContentHeaderSection>
      <EuiPageContentHeaderSection>
        <EuiFlexGroup responsive={false}>
          {canViewInApp && (
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                href={viewUrl}
                iconType="eye"
                data-test-subj="savedObjectEditViewInApp"
              >
                <FormattedMessage
                  id="savedObjectsManagement.view.viewItemButtonLabel"
                  defaultMessage="View {title}"
                  values={{ title: type }}
                />
              </EuiButton>
            </EuiFlexItem>
          )}
          {canDelete && (
            <EuiFlexItem grow={false}>
              <EuiButton
                color="danger"
                size="s"
                iconType="trash"
                onClick={() => onDeleteClick()}
                data-test-subj="savedObjectEditDelete"
              >
                <FormattedMessage
                  id="savedObjectsManagement.view.deleteItemButtonLabel"
                  defaultMessage="Delete {title}"
                  values={{ title: type }}
                />
              </EuiButton>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiPageContentHeaderSection>
    </EuiPageContentHeader>
  );
};
