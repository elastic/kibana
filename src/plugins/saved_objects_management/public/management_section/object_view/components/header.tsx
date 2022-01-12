/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiButton, EuiPageHeader } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

interface HeaderProps {
  canDelete: boolean;
  canViewInApp: boolean;
  viewUrl: string;
  onDeleteClick: () => void;
  title?: string;
}

export const Header = ({ canDelete, canViewInApp, viewUrl, onDeleteClick, title }: HeaderProps) => {
  return (
    <EuiPageHeader
      bottomBorder
      pageTitle={i18n.translate('savedObjectsManagement.view.inspectItemTitle', {
        defaultMessage: 'Inspect {title}',
        values: { title: title || 'saved object' },
      })}
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
              values={{ title: title || 'saved object' }}
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
              defaultMessage="Delete"
            />
          </EuiButton>
        ),
      ]}
    />
  );
};
