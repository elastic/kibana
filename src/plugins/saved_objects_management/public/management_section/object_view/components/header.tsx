/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiButton, EuiPageHeader } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

interface HeaderProps {
  canEdit: boolean;
  canDelete: boolean;
  canViewInApp: boolean;
  type: string;
  viewUrl: string;
  onDeleteClick: () => void;
}

const renderConditionalTitle = (canEdit: boolean, type: string) =>
  canEdit ? (
    <FormattedMessage
      id="savedObjectsManagement.view.editItemTitle"
      defaultMessage="Edit {title}"
      values={{ title: type }}
    />
  ) : (
    <FormattedMessage
      id="savedObjectsManagement.view.viewItemTitle"
      defaultMessage="View {title}"
      values={{ title: type }}
    />
  );

export const Header = ({
  canEdit,
  canDelete,
  canViewInApp,
  type,
  viewUrl,
  onDeleteClick,
}: HeaderProps) => {
  return (
    <EuiPageHeader
      bottomBorder
      pageTitle={renderConditionalTitle(canEdit, type)}
      rightSideItems={[
        canViewInApp && (
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
        ),
        canDelete && (
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
        ),
      ]}
    />
  );
};
