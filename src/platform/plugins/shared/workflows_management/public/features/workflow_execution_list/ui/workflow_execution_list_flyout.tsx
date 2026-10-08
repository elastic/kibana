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
  EuiFlexGroup,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { i18n } from '@kbn/i18n';
import { WorkflowExecutionList } from './workflow_execution_list_stateful';

export interface WorkflowExecutionListFlyoutProps {
  workflowId: string;
  onClose: () => void;
  /** Keep mounted but collapse out of the push layout while detail is shown. */
  isHidden?: boolean;
}

export const WorkflowExecutionListFlyout = ({
  workflowId,
  onClose,
  isHidden = false,
}: WorkflowExecutionListFlyoutProps) => {
  const { euiTheme } = useEuiTheme();
  const listHostRef = useRef<HTMLDivElement | null>(null);
  const flyoutSlotRef = useRef<HTMLDivElement>(null);
  if (listHostRef.current == null) {
    listHostRef.current = document.createElement('div');
  }
  const listHost = listHostRef.current;
  const ariaLabel = i18n.translate('workflows.executionListFlyout.ariaLabel', {
    defaultMessage: 'Workflow execution history',
  });

  // Pull the host out before the flyout unmounts, so that removal does not drop the list.
  if (isHidden) {
    listHost.style.display = 'none';
    listHost.setAttribute('aria-hidden', 'true');
    listHost.setAttribute('data-test-subj', 'workflowExecutionListFlyout');
    if (listHost.parentElement !== document.body) {
      document.body.appendChild(listHost);
    }
  }

  useLayoutEffect(() => {
    if (isHidden) {
      return;
    }
    listHost.style.display = '';
    listHost.removeAttribute('aria-hidden');
    listHost.removeAttribute('data-test-subj');
    const slot = flyoutSlotRef.current;
    if (slot && listHost.parentElement !== slot) {
      slot.appendChild(listHost);
    }
  });

  useEffect(() => {
    return () => {
      listHost.remove();
    };
  }, [listHost]);

  const list = createPortal(<WorkflowExecutionList workflowId={workflowId} />, listHost);

  return (
    <>
      {list}
      {!isHidden && (
        <EuiFlyout
          aria-label={ariaLabel}
          onClose={onClose}
          type="push"
          paddingSize="none"
          hideCloseButton
          ownFocus
          style={{ minWidth: '480px', maxWidth: '480px' }}
          data-test-subj="workflowExecutionListFlyout"
        >
          <div css={flyoutColumnStyles}>
            <EuiFlyoutHeader css={{ padding: 0 }}>
              <EuiFlexGroup
                justifyContent="flexEnd"
                alignItems="center"
                gutterSize="none"
                responsive={false}
                css={{
                  // AppHeader compact: 8px padding + 32px size="s" control = 48px.
                  boxSizing: 'border-box',
                  minHeight: 48,
                  paddingBlock: euiTheme.size.s,
                  paddingInline: euiTheme.size.s,
                  borderBottom: euiTheme.border.thin,
                }}
              >
                <EuiToolTip
                  content={i18n.translate('workflows.executionListFlyout.close', {
                    defaultMessage: 'Close',
                  })}
                  disableScreenReaderOutput
                >
                  <EuiButtonIcon
                    iconType="cross"
                    aria-label={i18n.translate('workflows.executionListFlyout.close', {
                      defaultMessage: 'Close',
                    })}
                    color="text"
                    size="s"
                    iconSize="m"
                    onClick={onClose}
                  />
                </EuiToolTip>
              </EuiFlexGroup>
            </EuiFlyoutHeader>

            {/* Bounded slot: the list scrolls inside it and Cancel all stays pinned underneath. */}
            <div ref={flyoutSlotRef} css={listSlotStyles} />
          </div>
        </EuiFlyout>
      )}
    </>
  );
};

const flyoutColumnStyles = css({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  height: '100%',
  minHeight: 0,
  overflow: 'hidden',
});

const listSlotStyles = css({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  overflow: 'hidden',
  // The list is portaled into a host div, so the host fills this slot and
  // passes that height through to the list.
  '& > *': {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
    height: '100%',
    overflow: 'hidden',
    '& > *': {
      flex: 1,
      minHeight: 0,
      height: '100%',
    },
  },
});
