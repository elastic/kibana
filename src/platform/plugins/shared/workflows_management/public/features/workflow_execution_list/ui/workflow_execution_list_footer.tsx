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

  const activeNonTerminalLoadedCount = useMemo(
    () => loadedExecutions.filter((e) => !isTerminalStatus(e.status)).length,
    [loadedExecutions]
  );

  const hasActiveNonTerminalLoaded = activeNonTerminalLoadedCount > 0;

  const openFooterCancelModal = useCallback(() => {
    if (hasActiveNonTerminalLoaded) {
      setIsFooterCancelModalVisible(true);
    }
  }, [hasActiveNonTerminalLoaded]);

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

  if (!hasActiveNonTerminalLoaded) {
    return null;
  }

  return (
    <>
      {isFooterCancelModalVisible ? (
        <EuiConfirmModal
          title={i18n.translate(
            'workflows.workflowExecutionList.footerCancelNonTerminal.modalTitle',
            {
              defaultMessage:
                'Cancel {count, plural, one {# active execution} other {# active executions}}?',
              values: { count: activeNonTerminalLoadedCount },
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
          data-test-subj="cancelAllActiveExecutionsConfirmationModal"
        >
          <p>
            <FormattedMessage
              id="workflows.workflowExecutionList.footerCancelNonTerminal.modalBody"
              defaultMessage="All non-terminal executions for this workflow in the current space will be cancelled, including any not shown on the current page."
            />
          </p>
        </EuiConfirmModal>
      ) : null}
      <EuiFlexItem
        grow={false}
        css={styles.footerSection}
        data-test-subj="workflowExecutionListFooter"
      >
        <EuiHorizontalRule margin="s" />
        <EuiButton
          color="warning"
          iconType="cross"
          size="s"
          fullWidth
          disabled={!canCancelLoadedNonTerminal || isCancelLoadedNonTerminalInProgress}
          onClick={openFooterCancelModal}
          data-test-subj="cancelAllActiveExecutionsButton"
        >
          <FormattedMessage
            id="workflows.workflowExecutionList.footerCancelNonTerminal.button"
            defaultMessage="Cancel {count, plural, one {# active execution} other {# active executions}}"
            values={{ count: activeNonTerminalLoadedCount }}
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
