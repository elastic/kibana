/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';

import {
  EuiButton,
  EuiButtonIcon,
  EuiCodeBlock,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiPopover,
  EuiPopoverFooter,
} from '@elastic/eui';

import { css } from '@emotion/react';
import { AggregateQuery, getAggregateQueryMode, isOfQueryType } from '@kbn/es-query';
import { ACTION_EDIT_PANEL } from '@kbn/presentation-panel-plugin/public';
import { FilterItems } from '@kbn/unified-search-plugin/public';
import {
  EmbeddableApiContext,
  apiCanLockHoverActions,
  getViewModeSubject,
  useBatchedOptionalPublishingSubjects,
} from '@kbn/presentation-publishing';
import { ActionExecutionMeta } from '@kbn/ui-actions-plugin/public';
import { CONTEXT_MENU_TRIGGER } from '@kbn/embeddable-plugin/public';
import { uiActionsService } from '../services/kibana_services';
import { dashboardFilterNotificationActionStrings } from './_dashboard_actions_strings';
import { ChangeZIndexActionApi } from './change_z_index_action';

export function ChangeZIndexPopover({ api }: { api: ChangeZIndexActionApi }) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  return (
    <EuiPopover
      button={
        <EuiButtonIcon
          color="text"
          iconType={'layers'}
          onClick={() => {
            setIsPopoverOpen(!isPopoverOpen);
            if (apiCanLockHoverActions(api)) {
              api?.lockHoverActions(!api.hasLockedHoverActions$.value);
            }
          }}
          data-test-subj={`embeddablePanelNotification-${api.uuid}`}
          aria-label={'Order'}
        />
      }
      isOpen={isPopoverOpen}
      closePopover={() => {
        setIsPopoverOpen(false);
        if (apiCanLockHoverActions(api)) {
          api.lockHoverActions(false);
        }
      }}
      anchorPosition="upCenter"
      panelPaddingSize="none"
    >
      <EuiContextMenuPanel
        size="s"
        items={[
          <EuiContextMenuItem
            key="edit"
            icon="sortUp"
            onClick={() => {
              setIsPopoverOpen(false);
              api.parentApi.bringToFront(api.uuid);
            }}
          >
            Bring to front
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            key="share"
            icon="sortDown"
            onClick={() => {
              setIsPopoverOpen(false);
              api.parentApi.sendToBack(api.uuid);
            }}
          >
            Send to back
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
}
