/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import React, { useCallback, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useQueryClient } from '@kbn/react-query';
import type { GetLinkedRulesResponse } from '@kbn/workflows-ui';
import { useWorkflowsApi } from '@kbn/workflows-ui';
import { linkedRulesQueryOptions } from './linked_rules_query_options';
import { LinkedRulesCallout } from '../ui/linked_rules_callout';

export type ConfirmDisableWorkflows = (workflowIds: string[]) => Promise<boolean>;

interface PendingConfirmation {
  workflowCount: number;
  data?: GetLinkedRulesResponse;
  isError: boolean;
}

/** Asks the user to confirm before disabling workflows that alerting rules run. */
export const useDisableWorkflowsConfirmation = (): {
  confirmDisable: ConfirmDisableWorkflows;
  confirmModal: JSX.Element | null;
} => {
  const api = useWorkflowsApi();
  const queryClient = useQueryClient();
  const modalTitleId = useGeneratedHtmlId();
  const [pending, setPending] = useState<PendingConfirmation | null>(null);
  const resolveRef = useRef<(confirmed: boolean) => void>();

  const confirmDisable = useCallback<ConfirmDisableWorkflows>(
    async (workflowIds) => {
      const result = await queryClient.fetchQuery(linkedRulesQueryOptions(api, workflowIds)).then(
        (data) => ({ data, isError: false }),
        () => ({ data: undefined, isError: true })
      );
      if (result.data?.total === 0) {
        return true;
      }
      return new Promise((resolve) => {
        resolveRef.current?.(false);
        resolveRef.current = resolve;
        setPending({ ...result, workflowCount: workflowIds.length });
      });
    },
    [api, queryClient]
  );

  const close = (confirmed: boolean) => {
    resolveRef.current?.(confirmed);
    resolveRef.current = undefined;
    setPending(null);
  };

  const confirmModal = pending && (
    <EuiConfirmModal
      title={i18n.translate('workflows.linkedRules.disableModal.title', {
        defaultMessage: 'Disable {count, plural, one {workflow} other {# workflows}}?',
        values: { count: pending.workflowCount },
      })}
      titleProps={{ id: modalTitleId }}
      aria-labelledby={modalTitleId}
      onCancel={() => close(false)}
      onConfirm={() => close(true)}
      cancelButtonText={i18n.translate('workflows.linkedRules.disableModal.cancel', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate('workflows.linkedRules.disableModal.confirm', {
        defaultMessage: 'Disable',
      })}
      buttonColor="warning"
      defaultFocusedButton="cancel"
      data-test-subj="workflowsDisableConfirmationModal"
    >
      <LinkedRulesCallout
        workflowCount={pending.workflowCount}
        data={pending.data}
        isError={pending.isError}
      />
    </EuiConfirmModal>
  );

  return { confirmDisable, confirmModal };
};
