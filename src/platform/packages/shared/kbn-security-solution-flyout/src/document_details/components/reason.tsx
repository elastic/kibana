/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import type { FC } from 'react';
import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { type DataTableRecord, getFieldValue } from '@kbn/discover-utils';
import {
  REASON_DETAILS_PREVIEW_BUTTON_TEST_ID,
  REASON_DETAILS_TEST_ID,
  REASON_TITLE_TEST_ID,
} from '../test_ids';

export interface ReasonProps {
  hit: DataTableRecord;
  onOpenReason: () => void;
}

const ALERT_REASON_FIELD = 'kibana.alert.reason';
const ALERT_RULE_UUID_FIELD = 'kibana.alert.rule.uuid';

/**
 * Displays the information provided by the rowRenderer. Supports multiple types of documents.
 */
export const Reason: FC<ReasonProps> = ({ hit, onOpenReason }) => {
  const alertReason = useMemo(
    () => (getFieldValue(hit, ALERT_REASON_FIELD) as string) ?? '',
    [hit]
  );
  const isAlert = useMemo(() => {
    const value = getFieldValue(hit, ALERT_RULE_UUID_FIELD);
    return value != null && value !== '';
  }, [hit]);
  const hasAlertReason = Boolean(alertReason?.trim());

  const viewPreview = useMemo(
    () => (
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          size="s"
          iconType="expand"
          onClick={onOpenReason}
          iconSide="right"
          data-test-subj={REASON_DETAILS_PREVIEW_BUTTON_TEST_ID}
          aria-label={i18n.translate(
            'xpack.securitySolution.flyout.right.about.reason.alertReasonButtonAriaLabel',
            {
              defaultMessage: 'Show full reason',
            }
          )}
          disabled={!hasAlertReason}
        >
          <FormattedMessage
            id="xpack.securitySolution.flyout.right.about.reason.alertReasonButtonLabel"
            defaultMessage="Show full reason"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
    ),
    [onOpenReason, hasAlertReason]
  );

  const alertReasonText = hasAlertReason ? (
    alertReason
  ) : (
    <FormattedMessage
      id="xpack.securitySolution.flyout.right.about.reason.noReasonDescription"
      defaultMessage="There's no source event information for this alert."
    />
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem data-test-subj={REASON_TITLE_TEST_ID}>
        <EuiTitle size="xxs">
          <h5>
            {isAlert ? (
              <EuiFlexGroup
                justifyContent="spaceBetween"
                alignItems="center"
                gutterSize="none"
                responsive={false}
              >
                <EuiFlexItem grow={false}>
                  <h5>
                    <FormattedMessage
                      id="xpack.securitySolution.flyout.right.about.reason.alertReasonTitle"
                      defaultMessage="Alert reason"
                    />
                  </h5>
                </EuiFlexItem>
                {viewPreview}
              </EuiFlexGroup>
            ) : (
              <p>
                <FormattedMessage
                  id="xpack.securitySolution.flyout.right.about.reason.documentReasonTitle"
                  defaultMessage="Document reason"
                />
              </p>
            )}
          </h5>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem data-test-subj={REASON_DETAILS_TEST_ID}>
        {isAlert ? alertReasonText : '-'}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

Reason.displayName = 'Reason';
