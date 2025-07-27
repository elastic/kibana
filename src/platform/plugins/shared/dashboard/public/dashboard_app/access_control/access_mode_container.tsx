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
import { useAccessControl } from '../hooks/use_access_control';
import type { AccessControl, AccessMode } from './types';
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
  onChangeAccessMode: (value: AccessMode) => void;
  accessControl?: AccessControl;
}

export const AccessModeContainer = ({ onChangeAccessMode, accessControl }: Props) => {
  const { isCurrentUserAuthor, isInEditAccessMode } = useAccessControl({
    accessControl,
    createdBy: 'TODO',
  });
  const [spaceName, setSpaceName] = useState('');

  useEffect(() => {
    spacesService?.getActiveSpace().then((activeSpace) => {
      setSpaceName(activeSpace.name);
    });
  }, []);

  const selectId = useGeneratedHtmlId({ prefix: 'accessControlSelect' });

  const handleSelectChange = (e: ChangeEvent<HTMLSelectElement>) => {
    onChangeAccessMode(e.target.value as AccessMode);
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
                    id="dashboard.accessControl.accessMode.container.description.text"
                    defaultMessage="Everybody in the space {spaceName}{editMode}"
                    // TODO: Space name should be a badge with security icon
                    values={{ spaceName, editMode: isInEditAccessMode ? ' can edit' : ' can view' }}
                  />
                </EuiText>
              </EuiFlexItem>
              {!isCurrentUserAuthor && (
                <EuiFlexItem
                  grow={false}
                  data-test-subj="dashboardAccessModeContainerDescriptionTooltip"
                >
                  <EuiIconTip
                    type="info"
                    content={
                      <FormattedMessage
                        id="dashboard.accessControl.accessMode.container.description.tooltipContent"
                        // TODO: Replace author with creator name using UserProfileService.bulkGet
                        defaultMessage="Only author can edit permissions"
                      />
                    }
                    aria-label={i18n.translate(
                      'dashboard.accessControl.accessMode.container.description.tooltipAriaLabel',
                      {
                        // TODO: Replace author with creator name using UserProfileService.bulkGet
                        defaultMessage: 'Only author can edit permissions',
                      }
                    )}
                    position="bottom"
                  />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {isCurrentUserAuthor && (
              <EuiSelect
                id={selectId}
                data-test-subj="dashboardAccessModeSelect"
                options={selectOptions}
                defaultValue={accessControl?.accessMode ?? 'default'}
                onChange={handleSelectChange}
                aria-label={i18n.translate(
                  'dashboard.accessControl.accessMode.container.select.ariaLabel',
                  {
                    defaultMessage: 'Modify access control for the dashboard',
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
