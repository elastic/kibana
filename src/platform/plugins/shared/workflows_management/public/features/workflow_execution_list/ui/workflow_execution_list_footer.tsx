/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButton,
  EuiConfirmModal,
  EuiFlexItem,
  EuiHorizontalRule,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useMemo, useState } from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { isTerminalStatus, type WorkflowExecutionListItemDto } from '@kbn/workflows';

export interface WorkflowExecutionListFooterProps {
  loadedExecutions: readonly WorkflowExecutionListItemDto[];
  canCancelLoadedNonTerminal: boolean;
  isCancelLoadedNonTerminalInProgress: boolean;
  onConfirmCancelLoadedNonTerminal: () => Promise<void>;
}

export const WorkflowExecutionListFooter = ({
  loadedExecutions,
  canCancelLoadedNonTerminal,
  isCancelLoadedNonTerminalInProgress,
  onConfirmCancelLoadedNonTerminal,
}: WorkflowExecutionListFooterProps) => {
  const styles = useMemoCss(componentStyles);
  const [isFooterCancelModalVisible, setIsFooterCancelModalVisible] = useState(false);
  const footerCancelModalTitleId = useGeneratedHtmlId();

  const isCancelActiveEnabled = useMemo(
    () => loadedExecutions.some((e) => !isTerminalStatus(e.status)),
    [loadedExecutions]
  );

  const openFooterCancelModal = useCallback(() => {
    if (isCancelActiveEnabled) {
      setIsFooterCancelModalVisible(true);
    }
  }, [isCancelActiveEnabled]);

  const closeFooterCancelModal = useCallback(() => {
    if (!isCancelLoadedNonTerminalInProgress) {
      setIsFooterCancelModalVisible(false);
    }
  }, [isCancelLoadedNonTerminalInProgress]);

  const confirmFooterCancel = useCallback(async () => {
    try {
      await onConfirmCancelLoadedNonTerminal();
    } finally {
      setIsFooterCancelModalVisible(false);
    }
  }, [onConfirmCancelLoadedNonTerminal]);

  return (
    <>
      {isFooterCancelModalVisible ? (
        <EuiConfirmModal
          title={i18n.translate(
            'workflows.workflowExecutionList.footerCancelNonTerminal.modalTitle',
            {
              defaultMessage:
                'Cancel {count, plural, one {# active execution} other {# active executions}}?',
              values: { count: isCancelActiveEnabled },
            }
          )}
          titleProps={{ id: footerCancelModalTitleId }}
          aria-labelledby={footerCancelModalTitleId}
          onCancel={closeFooterCancelModal}
          onConfirm={confirmFooterCancel}
          cancelButtonText={i18n.translate(
            'workflows.workflowExecutionList.footerCancelNonTerminal.modalCancel',
            {
              defaultMessage: 'Cancel',
            }
          )}
          confirmButtonText={i18n.translate(
            'workflows.workflowExecutionList.footerCancelNonTerminal.modalConfirm',
            {
              defaultMessage: 'Cancel all',
            }
          )}
          buttonColor="warning"
          defaultFocusedButton="cancel"
          isLoading={isCancelLoadedNonTerminalInProgress}
          data-test-subj="workflowExecutionListFooterCancelModal"
        >
          <p>
            <FormattedMessage
              id="workflows.workflowExecutionList.footerCancelNonTerminal.modalBody"
              defaultMessage="In-progress executions in this visible list only. Other pages of results are not included."
            />
          </p>
        </EuiConfirmModal>
      ) : null}
      <EuiFlexItem grow={false} css={styles.footerSection}>
        <EuiHorizontalRule margin="s" />
        <EuiButton
          color="warning"
          iconType="cross"
          size="s"
          fullWidth
          disabled={
            !isCancelActiveEnabled ||
            !canCancelLoadedNonTerminal ||
            isCancelLoadedNonTerminalInProgress
          }
          onClick={openFooterCancelModal}
          data-test-subj="workflowExecutionListFooterCancelNonTerminalButton"
        >
          <FormattedMessage
            id="workflows.workflowExecutionList.footerCancelNonTerminal.button"
            defaultMessage="Cancel all active"
          />
        </EuiButton>
      </EuiFlexItem>
    </>
  );
};

const componentStyles = {
  // Keep footer visually last when this fragment is rendered before header/scroll in the tree.
  footerSection: css({
    flexShrink: 0,
    order: 3,
  }),
};
