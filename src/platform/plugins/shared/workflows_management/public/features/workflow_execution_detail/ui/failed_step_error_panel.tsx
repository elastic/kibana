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
  EuiButtonEmpty,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SerializedError } from '@kbn/workflows';
import type { ErrorPanelDiagnoseState } from '../lib/derive_error_panel_diagnose_availability';

interface FailedStepErrorPanelProps {
  error: SerializedError | string;
  stepType?: string;
  onViewInput: () => void;
  /** Accessible name for the error region (visually hidden). */
  ariaLabel: string;
  /**
   * When set, replaces the raw error body (e.g. retry exhaustion lead-in that
   * already includes the last error message).
   */
  messageOverride?: string;
  /**
   * AI diagnose availability (A–D). Defaults to D (pre-AB: View input + Copy error).
   */
  diagnoseState?: ErrorPanelDiagnoseState;
  /** Required when diagnoseState is A or B. */
  onDiagnose?: () => void;
  /** Disables Diagnose and shows a loading state while the AB handoff runs. */
  isDiagnoseLoading?: boolean;
  /** Required when diagnoseState is C — license management deep link. */
  requiredLicenseTier?: string;
  licenseManagementHref?: string;
  onOpenLicenseManagement?: () => void;
}

const diagnosePrimaryLabel = i18n.translate('workflows.executionFlyout.failedStep.diagnoseWithAi', {
  defaultMessage: 'Diagnose with AI',
});

/**
 * Inline error details under a failed row. Message-first; no visible heading.
 * CTAs follow diagnose availability states A–D (exactly one bordered primary +
 * one text secondary).
 */
export const FailedStepErrorPanel = React.memo<FailedStepErrorPanelProps>(
  ({
    error,
    stepType,
    onViewInput,
    ariaLabel,
    messageOverride,
    diagnoseState = 'd',
    onDiagnose,
    isDiagnoseLoading = false,
    requiredLicenseTier = 'enterprise',
    licenseManagementHref,
    onOpenLicenseManagement,
  }) => {
    const { euiTheme } = useEuiTheme();

    const message = messageOverride ?? (typeof error === 'string' ? error : error.message);
    const copyText = typeof error === 'string' ? error : JSON.stringify(error, null, 2);

    const isHttpStep = stepType?.startsWith('http') ?? false;
    const viewInputLabel = isHttpStep
      ? i18n.translate('workflows.executionFlyout.failedStep.viewRequest', {
          defaultMessage: 'View request',
        })
      : i18n.translate('workflows.executionFlyout.failedStep.viewInput', {
          defaultMessage: 'View input',
        });

    const copyErrorLabel = i18n.translate('workflows.executionFlyout.failedStep.copyError', {
      defaultMessage: 'Copy error',
    });

    const showDiagnose = diagnoseState === 'a' || diagnoseState === 'b';
    const showLicenseTeaser = diagnoseState === 'c';

    const primaryButton = showDiagnose ? (
      <EuiButton
        size="s"
        color="danger"
        fill={false}
        iconType="sparkles"
        onClick={onDiagnose}
        isLoading={isDiagnoseLoading}
        isDisabled={isDiagnoseLoading}
        data-test-subj="workflowFailedStepDiagnose"
        aria-label={diagnosePrimaryLabel}
      >
        {diagnosePrimaryLabel}
      </EuiButton>
    ) : (
      <EuiButton
        size="s"
        color="danger"
        fill={false}
        onClick={onViewInput}
        data-test-subj="workflowFailedStepViewInput"
      >
        {viewInputLabel}
      </EuiButton>
    );

    const secondaryButton = showDiagnose ? (
      <EuiButtonEmpty
        size="s"
        color="danger"
        onClick={onViewInput}
        data-test-subj="workflowFailedStepViewInput"
      >
        {viewInputLabel}
      </EuiButtonEmpty>
    ) : (
      <EuiCopy textToCopy={copyText}>
        {(copy) => (
          <EuiButtonEmpty
            size="s"
            color="danger"
            onClick={copy}
            data-test-subj="workflowFailedStepCopyError"
          >
            {copyErrorLabel}
          </EuiButtonEmpty>
        )}
      </EuiCopy>
    );

    return (
      <div
        role="region"
        aria-label={ariaLabel}
        data-test-subj="workflowFailedStepErrorPanel"
        data-diagnose-state={diagnoseState}
        css={{
          marginTop: euiTheme.size.xs,
          padding: euiTheme.size.s,
          borderTop: `1px solid ${euiTheme.colors.borderBaseDanger}`,
        }}
      >
        {/* Capture bubbling row clicks without making the region itself a click target. */}
        <div
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
        >
          <EuiText size="xs" color="danger" data-test-subj="workflowFailedStepErrorMessage">
            <p>{message}</p>
          </EuiText>
          <EuiFlexGroup
            gutterSize="s"
            alignItems="center"
            responsive={false}
            css={{ marginTop: euiTheme.size.s }}
          >
            <EuiFlexItem grow={false}>{primaryButton}</EuiFlexItem>
            <EuiFlexItem grow={false}>{secondaryButton}</EuiFlexItem>
          </EuiFlexGroup>
          {showLicenseTeaser && (
            <EuiFlexGroup
              gutterSize="xs"
              alignItems="center"
              responsive={false}
              css={{ marginTop: euiTheme.size.s }}
              data-test-subj="workflowFailedStepDiagnoseLicenseTeaser"
            >
              <EuiFlexItem grow={false}>
                <EuiIcon type="sparkles" size="s" color="subdued" aria-hidden={true} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  <FormattedMessage
                    id="workflows.executionFlyout.failedStep.diagnoseLicenseTeaser"
                    defaultMessage="Diagnose with AI — {licenseLink}"
                    values={{
                      licenseLink: (
                        <EuiLink
                          href={licenseManagementHref}
                          onClick={(ev: React.MouseEvent<HTMLAnchorElement>) => {
                            ev.preventDefault();
                            onOpenLicenseManagement?.();
                          }}
                          data-test-subj="workflowFailedStepDiagnoseLicenseLink"
                        >
                          {i18n.translate(
                            'workflows.executionFlyout.failedStep.diagnoseRequiresLicense',
                            {
                              defaultMessage: 'requires {tier} license',
                              values: { tier: requiredLicenseTier },
                            }
                          )}
                        </EuiLink>
                      ),
                    }}
                  />
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </div>
      </div>
    );
  }
);

FailedStepErrorPanel.displayName = 'FailedStepErrorPanel';
