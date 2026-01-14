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
  EuiBetaBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import type { SavedObjectAccessControl } from '@kbn/core-saved-objects-common';
import type { Space } from '@kbn/spaces-plugin/common';
import type { GetUserProfileResponse } from '@kbn/security-plugin/common';
import type { UserProfileData } from '@kbn/user-profile-components';
import { css } from '@emotion/react';
import type { AccessControlClient } from '../access_control_client';

const selectOptions = [
  {
    value: 'default',
    text: (
      <FormattedMessage
        id="contentManagement.accessControl.accessMode.container.select.options.isEditable"
        defaultMessage="Can edit"
      />
    ),
  },
  {
    value: 'write_restricted',
    text: (
      <FormattedMessage
        id="contentManagement.accessControl.accessMode.container.select.options.isReadOnly"
        defaultMessage="Can view"
      />
    ),
  },
];

const getSpaceIcon = (space: Space['solution']) => {
  switch (space) {
    case 'es':
    case 'workplaceai':
      return 'logoElasticsearch';
    case 'security':
      return 'logoSecurity';
    case 'oblt':
      return 'logoObservability';
    case 'classic':
      return 'logoElasticStack';
    default:
      return undefined; // No icon for default space and serverless spaces
  }
};

interface Props {
  onChangeAccessMode: (
    value: SavedObjectAccessControl['accessMode']
  ) => Promise<string | void> | string | void;
  getActiveSpace?: () => Promise<Space>;
  getCurrentUser: () => Promise<GetUserProfileResponse<UserProfileData>>;
  accessControlClient: AccessControlClient;
  contentTypeId: string;
  accessControl?: Partial<SavedObjectAccessControl>;
  createdBy?: string;
}

export const AccessModeContainer = ({
  onChangeAccessMode,
  getActiveSpace,
  getCurrentUser,
  accessControlClient,
  contentTypeId,
  accessControl,
  createdBy,
}: Props) => {
  const { euiTheme } = useEuiTheme();
  const [space, setSpace] = useState<Space>({} as Space);
  const [isUpdatingPermissions, setIsUpdatingPermissions] = useState(false);
  const [canManageAccessControl, setCanManageAccessControl] = useState(false);
  const [isAccessControlEnabled, setIsAccessControlEnabled] = useState(false);
  const [tooltipContent, setTooltipContent] = useState('');
  const isInEditAccessMode = accessControlClient.isInEditAccessMode(accessControl);

  useEffect(() => {
    const checkAccessControlEnabled = async () => {
      const enabled = await accessControlClient.isAccessControlEnabled();
      setIsAccessControlEnabled(enabled);
    };

    checkAccessControlEnabled();
  }, [accessControlClient]);

  useEffect(() => {
    getActiveSpace?.().then((activeSpace) => {
      setSpace(activeSpace);
    });
  }, [getActiveSpace]);

  useEffect(() => {
    const getCanManage = async () => {
      const user = await getCurrentUser();
      const canManage = await accessControlClient.canManageAccessControl({
        accessControl,
        createdBy,
        userId: user?.uid,
        contentTypeId,
      });
      setCanManageAccessControl(canManage);
    };

    getCanManage();
  }, [accessControl, createdBy, accessControlClient, contentTypeId, getCurrentUser]);

  useEffect(() => {
    if (tooltipContent) {
      const timeout = setTimeout(() => setTooltipContent(''), 2000);
      return () => clearTimeout(timeout);
    }
  }, [tooltipContent]);

  const selectId = useGeneratedHtmlId({ prefix: 'accessControlSelect' });

  const handleSelectChange = async (e: ChangeEvent<HTMLSelectElement>) => {
    setTooltipContent('');
    setIsUpdatingPermissions(true);

    try {
      const result = await onChangeAccessMode(
        e.target.value as SavedObjectAccessControl['accessMode']
      );

      if (result?.length) {
        setTooltipContent(result);
      }
    } catch (error) {
      setTooltipContent('');
    } finally {
      setIsUpdatingPermissions(false);
    }
  };

  if (!isAccessControlEnabled) {
    return null;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="s" data-test-subj="accessModeContainer">
      <EuiFlexItem>
        <EuiFlexGroup direction="row" alignItems="center" gutterSize="xs">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h4>
                <FormattedMessage
                  id="contentManagement.accessControl.accessMode.container.title"
                  defaultMessage="Permissions"
                />
              </h4>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBetaBadge
              // TODO: use a proper EuiBetaBadge color variant once available https://github.com/elastic/eui/issues/9268
              css={css`
                background-color: ${euiTheme.colors.backgroundFilledPrimary};
                color: ${euiTheme.colors.textInverse};
                border: none;
              `}
              label={i18n.translate(
                'contentManagement.accessControl.accessMode.container.newBadgeLabel',
                { defaultMessage: 'New' }
              )}
              size="s"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
          <EuiFlexItem>
            <EuiFlexGroup direction="row" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <FormattedMessage
                    id="contentManagement.accessControl.accessMode.container.description.content"
                    defaultMessage="Everybody in the space"
                  />
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge iconType={getSpaceIcon(space?.solution)} color="hollow">
                  {space?.name}
                </EuiBadge>
              </EuiFlexItem>
              {!canManageAccessControl && (
                <>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s">
                      <FormattedMessage
                        id="contentManagement.accessControl.accessMode.container.description.permissionType"
                        defaultMessage="can {permissionType}"
                        values={{
                          permissionType: isInEditAccessMode ? 'edit' : 'view',
                        }}
                      />
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false} data-test-subj="accessModeContainerDescriptionTooltip">
                    <EuiIconTip
                      type="info"
                      content={
                        <FormattedMessage
                          id="contentManagement.accessControl.accessMode.container.description.tooltipContent"
                          defaultMessage="Only the {contentTypeId} owner can edit permissions."
                          values={{ contentTypeId }}
                        />
                      }
                      aria-label={i18n.translate(
                        'contentManagement.accessControl.accessMode.container.description.tooltipAriaLabel',
                        {
                          defaultMessage: 'Only the {contentTypeId} owner can edit permissions.',
                          values: { contentTypeId },
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
              <EuiToolTip content={tooltipContent || null}>
                <EuiSelect
                  id={selectId}
                  isLoading={isUpdatingPermissions}
                  disabled={isUpdatingPermissions}
                  data-test-subj="accessModeSelect"
                  options={selectOptions}
                  defaultValue={accessControl?.accessMode ?? 'default'}
                  onChange={handleSelectChange}
                  aria-label={i18n.translate(
                    'contentManagement.accessControl.accessMode.container.select.ariaLabel',
                    {
                      defaultMessage: 'Modify access acess mode for the {contentTypeId}.',
                      values: { contentTypeId },
                    }
                  )}
                />
              </EuiToolTip>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiSpacer size="m" />
    </EuiFlexGroup>
  );
};
