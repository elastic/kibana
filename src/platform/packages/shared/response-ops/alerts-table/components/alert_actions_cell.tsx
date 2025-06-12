/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButtonIcon,
  EuiFlexItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';

import React, { useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { DefaultAlertActions } from './default_alert_actions';
import type { GetAlertsTableProp } from '../types';
import { STACK_MANAGEMENT_RULE_PAGE_URL_PREFIX } from '../constants';

const actionsToolTip = i18n.translate('xpack.triggersActionsUI.alertsTable.moreActionsTextLabel', {
  defaultMessage: 'More actions',
});

/**
 * Cell containing contextual actions for a single alert row in the table
 */
export const AlertActionsCell: GetAlertsTableProp<'renderActionsCell'> = (props) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  const closeActionsPopover = () => {
    setIsPopoverOpen(false);
  };

  const toggleActionsPopover = () => {
    setIsPopoverOpen(!isPopoverOpen);
  };

  const DefaultRowActions = useMemo(
    () => (
      <DefaultAlertActions
        key="defaultRowActions"
        onActionExecuted={closeActionsPopover}
        isAlertDetailsEnabled={false}
        resolveRulePagePath={(alertRuleId) =>
          alertRuleId ? `${STACK_MANAGEMENT_RULE_PAGE_URL_PREFIX}${alertRuleId}` : null
        }
        {...props}
      />
    ),
    [props]
  );

  // TODO re-enable view in app when it works
  const actionsMenuItems = [DefaultRowActions];

  return (
    <>
      <EuiFlexItem>
        <EuiPopover
          anchorPosition="downLeft"
          button={
            <EuiToolTip content={actionsToolTip}>
              <EuiButtonIcon
                aria-label={actionsToolTip}
                color="text"
                data-test-subj="alertsTableRowActionMore"
                display="empty"
                iconType="boxesHorizontal"
                onClick={toggleActionsPopover}
                size="s"
              />
            </EuiToolTip>
          }
          closePopover={closeActionsPopover}
          isOpen={isPopoverOpen}
          panelPaddingSize="none"
        >
          <EuiContextMenuPanel
            size="s"
            items={actionsMenuItems}
            data-test-subj="alertsTableActionsMenu"
          />
        </EuiPopover>
      </EuiFlexItem>
    </>
  );
};
