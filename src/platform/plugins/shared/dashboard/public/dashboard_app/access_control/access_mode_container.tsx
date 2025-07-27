/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ChangeEvent, useState, useEffect } from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { SavedObjectAccessControl } from '@kbn/core/server';
import { useAccessControl } from '../hooks/use_access_control';
import { spacesService } from '../../services/kibana_services';

const selectOptions = [
  {
    value: 'default',
    text: (
      <FormattedMessage
        id="dashboard.accessControl.accessMode.container.select.options.isEditable"
        defaultMessage="Can edit"
      />
    ),
  },
  {
    value: 'read_only',
    text: (
      <FormattedMessage
        id="dashboard.accessControl.accessMode.container.select.options.isReadOnly"
        defaultMessage="Can view"
      />
    ),
  },
];

interface Props {
  onChangeAccessMode: (value: SavedObjectAccessControl['accessMode']) => Promise<void> | void;
  accessControl?: Partial<SavedObjectAccessControl>;
  createdBy?: string;
}

export const AccessModeContainer = ({ onChangeAccessMode, accessControl, createdBy }: Props) => {
  const { canManageAccessControl, isInEditAccessMode, authorName } = useAccessControl({
    accessControl,
    createdBy,
  });
  const [spaceName, setSpaceName] = useState('');
  const [isUpdatingPermissions, setIsUpdatingPermissions] = useState(false);

  useEffect(() => {
    spacesService?.getActiveSpace().then((activeSpace) => {
      setSpaceName(activeSpace.name);
    });
  }, []);

  const selectId = useGeneratedHtmlId({ prefix: 'accessControlSelect' });

  const handleSelectChange = async (e: ChangeEvent<HTMLSelectElement>) => {
    setIsUpdatingPermissions(true);
    await onChangeAccessMode(e.target.value as SavedObjectAccessControl['accessMode']);
    setIsUpdatingPermissions(false);
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="s" data-test-subj="dashboardAccessModeContainer">
      <EuiFlexItem>
        <EuiTitle size="xs">
          <h4>
            <FormattedMessage
              id="dashboard.accessControl.accessMode.container.title"
              defaultMessage="Permissions"
            />
          </h4>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
          <EuiFlexItem>
            <EuiFlexGroup direction="row" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <FormattedMessage
                    id="dashboard.accessControl.accessMode.container.description.content"
                    defaultMessage="Everybody in the space"
                  />
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge iconType="logoSecurity" color="hollow">
                  {spaceName}
                </EuiBadge>
              </EuiFlexItem>
              {!canManageAccessControl && (
                <>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s">
                      <FormattedMessage
                        id="dashboard.accessControl.accessMode.container.description.permissionType"
                        defaultMessage="can {permissionType}"
                        values={{
                          permissionType: isInEditAccessMode ? 'edit' : 'view',
                        }}
                      />
                    </EuiText>{' '}
                  </EuiFlexItem>
                  <EuiFlexItem
                    grow={false}
                    data-test-subj="dashboardAccessModeContainerDescriptionTooltip"
                  >
                    <EuiIconTip
                      type="info"
                      content={
                        <FormattedMessage
                          id="dashboard.accessControl.accessMode.container.description.tooltipContent"
                          defaultMessage="Only {authorName} and admins can edit permissions."
                          values={{ authorName: authorName || 'the author' }}
                        />
                      }
                      aria-label={i18n.translate(
                        'dashboard.accessControl.accessMode.container.description.tooltipAriaLabel',
                        {
                          defaultMessage: 'Only {authorName} and admins can edit permissions.',
                          values: {
                            authorName: authorName || 'the author',
                          },
                        }
                      )}
                      position="bottom"
                    />
                  </EuiFlexItem>
                </>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {canManageAccessControl && (
              <EuiSelect
                id={selectId}
                isLoading={isUpdatingPermissions}
                disabled={isUpdatingPermissions}
                data-test-subj="dashboardAccessModeSelect"
                options={selectOptions}
                defaultValue={accessControl?.accessMode ?? 'default'}
                onChange={handleSelectChange}
                aria-label={i18n.translate(
                  'dashboard.accessControl.accessMode.container.select.ariaLabel',
                  {
                    defaultMessage: 'Modify access acess mode for the dashboard',
                  }
                )}
              />
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiSpacer size="m" />
    </EuiFlexGroup>
  );
};
