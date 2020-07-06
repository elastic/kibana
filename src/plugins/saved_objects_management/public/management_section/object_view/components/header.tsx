/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
