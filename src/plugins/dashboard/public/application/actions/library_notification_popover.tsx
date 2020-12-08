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
import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { LibraryNotificationActionContext, UnlinkFromLibraryAction } from '.';

export interface LibraryNotificationProps {
  context: LibraryNotificationActionContext;
  unlinkAction: UnlinkFromLibraryAction;
  displayName: string;
  icon: string;
  id: string;
}

export function LibraryNotificationPopover({
  unlinkAction,
  displayName,
  context,
  icon,
  id,
}: LibraryNotificationProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { embeddable } = context;

  return (
    <EuiPopover
      button={
        <EuiButtonIcon
          data-test-subj={`embeddablePanelNotification-${id}`}
          iconType={icon}
          aria-label={i18n.translate('dashboard.panel.libraryNotification.ariaLabel', {
            defaultMessage: 'View library information and unlink this panel',
          })}
          color="text"
          onClick={() => setIsPopoverOpen(!isPopoverOpen)}
        />
      }
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      anchorPosition="upCenter"
    >
      <EuiPopoverTitle>{displayName}</EuiPopoverTitle>
      <div style={{ width: '300px' }}>
        <EuiText>
          <p>
            {i18n.translate('dashboard.panel.libraryNotification.toolTip', {
              defaultMessage:
                'Editing this panel might affect other dashboards. To change to this panel only, unlink it from the library.',
            })}
          </p>
        </EuiText>
      </div>
      <EuiPopoverFooter>
        <EuiFlexGroup
          gutterSize="s"
          alignItems="center"
          justifyContent="flexEnd"
          responsive={false}
          wrap={true}
        >
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj={'libraryNotificationUnlinkButton'}
              size="s"
              fill
              onClick={() => unlinkAction.execute({ embeddable })}
            >
              {unlinkAction.getDisplayName({ embeddable })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopoverFooter>
    </EuiPopover>
  );
}
