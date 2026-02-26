/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiAccordion,
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DashboardState } from '../../server';
import { getSanitizedExportSource } from './dashboard_export_source_client';

export interface ExportSourceAssetPanelProps {
  title: string;
  dashboardState: DashboardState;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'success'; data: DashboardState; warnings: string[] }
  | { status: 'error'; data: DashboardState; warnings: string[]; errorMessage: string };

const WARNING_LIST_MAX_HEIGHT = 240;

export const ExportSourceAssetPanel = ({ title, dashboardState }: ExportSourceAssetPanelProps) => {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });
  const warningsAccordionId = useGeneratedHtmlId({ prefix: 'dashboardExportSourceWarnings' });
  const [isWarningsExpanded, setIsWarningsExpanded] = useState(false);
  const [showWarningsCallout, setShowWarningsCallout] = useState(true);
  const [showErrorCallout, setShowErrorCallout] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoadState({ status: 'loading' });
    setIsWarningsExpanded(false);
    setShowWarningsCallout(true);
    setShowErrorCallout(true);

    getSanitizedExportSource(dashboardState)
      .then(({ data, warnings }) => {
        if (!isMounted) return;
        setLoadState({ status: 'success', data, warnings });
      })
      .catch((e) => {
        if (!isMounted) return;
        const errorMessage = e instanceof Error ? e.message : String(e);
        setLoadState({
          status: 'error',
          data: dashboardState,
          warnings: [],
          errorMessage,
        });
      });

    return () => {
      isMounted = false;
    };
  }, [dashboardState]);

  const warnings =
    loadState.status === 'success' || loadState.status === 'error' ? loadState.warnings : [];
  const sanitizedState =
    loadState.status === 'success' || loadState.status === 'error' ? loadState.data : undefined;

  const jsonValue = useMemo(
    () => JSON.stringify(sanitizedState ?? dashboardState, null, 2),
    [sanitizedState, dashboardState]
  );

  return (
    <EuiFlexItem grow css={{ minHeight: 0 }}>
      <EuiFlexGroup direction="column" gutterSize="s" css={{ flex: '1 1 auto', minHeight: 0 }}>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <h4>
              {i18n.translate('dashboard.exportSource.panelTitle', {
                defaultMessage: 'Dashboard export source',
              })}
            </h4>
          </EuiText>
          <EuiText size="s" color="subdued">
            {i18n.translate('dashboard.exportSource.panelDescription', {
              defaultMessage: 'Use this JSON as the source for automated exports.',
            })}
          </EuiText>
        </EuiFlexItem>

        {showErrorCallout && loadState.status === 'error' ? (
          <EuiFlexItem grow={false}>
            <EuiCallOut
              color="danger"
              iconType="warning"
              title={i18n.translate('dashboard.exportSource.sanitizeErrorTitle', {
                defaultMessage: 'Could not sanitize export source',
              })}
              data-test-subj="dashboardExportSourceSanitizeError"
              onDismiss={() => setShowErrorCallout(false)}
            >
              <EuiText size="s">
                {i18n.translate('dashboard.exportSource.sanitizeErrorBody', {
                  defaultMessage:
                    'The export source could not be checked for unsupported panels. Downloaded JSON may include unsupported panels.',
                })}
              </EuiText>
              <EuiText size="s" color="subdued">
                {errorMessageLabel(loadState.errorMessage)}
              </EuiText>
            </EuiCallOut>
          </EuiFlexItem>
        ) : null}

        {showWarningsCallout && warnings.length ? (
          <EuiFlexItem grow={false}>
            <EuiCallOut
              color="warning"
              iconType="alert"
              title={i18n.translate('dashboard.exportSource.warningsTitle', {
                defaultMessage: 'Unsupported panels were removed',
              })}
              data-test-subj="dashboardExportSourceWarnings"
              onDismiss={() => {
                setShowWarningsCallout(false);
                setIsWarningsExpanded(false);
              }}
            >
              <EuiText size="s" color="subdued">
                {i18n.translate('dashboard.exportSource.warningsSummary', {
                  defaultMessage:
                    '{count} item{count, plural, one {} other {s}} removed from the export source.',
                  values: { count: warnings.length },
                })}
              </EuiText>

              <EuiAccordion
                id={warningsAccordionId}
                initialIsOpen={false}
                onToggle={setIsWarningsExpanded}
                buttonContent={
                  isWarningsExpanded
                    ? i18n.translate('dashboard.exportSource.warningsAccordionHide', {
                        defaultMessage: 'Hide details',
                      })
                    : i18n.translate('dashboard.exportSource.warningsAccordionShow', {
                        defaultMessage: 'Show details',
                      })
                }
              >
                {isWarningsExpanded ? (
                  <EuiText
                    size="s"
                    css={{
                      maxHeight: WARNING_LIST_MAX_HEIGHT,
                      overflowY: 'auto',
                      paddingRight: 8,
                      paddingBottom: 8,
                      marginTop: 8,
                      ul: {
                        marginBottom: 0,
                      },
                    }}
                    data-test-subj="dashboardExportSourceWarningsList"
                  >
                    <ul>
                      {warnings.map((warning, idx) => (
                        <li key={`${idx}-${warning}`}>{warning}</li>
                      ))}
                    </ul>
                  </EuiText>
                ) : null}
              </EuiAccordion>
            </EuiCallOut>
          </EuiFlexItem>
        ) : null}

        <EuiFlexItem grow css={{ minHeight: 0 }}>
          {loadState.status === 'loading' ? (
            <EuiFlexGroup
              direction="column"
              alignItems="center"
              justifyContent="center"
              css={{ height: '100%' }}
              gutterSize="s"
            >
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner
                  size="xl"
                  data-test-subj="dashboardExportSourceLoading"
                  aria-label={i18n.translate('dashboard.exportSource.loadingLabel', {
                    defaultMessage: 'Loading export source',
                  })}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued">
                  {i18n.translate('dashboard.exportSource.loadingText', {
                    defaultMessage: 'Checking panels for export compatibility…',
                  })}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : (
            <EuiCodeBlock
              data-test-subj="exportAssetValue"
              css={{ overflowWrap: 'break-word' }}
              overflowHeight="100%"
              language="json"
              whiteSpace="pre"
              isCopyable
              isVirtualized
              copyAriaLabel={i18n.translate('dashboard.exportSource.copyAriaLabel', {
                defaultMessage: 'Copy export source JSON',
              })}
              aria-label={i18n.translate('dashboard.exportSource.codeBlockAriaLabel', {
                defaultMessage: 'Export source JSON for {title}',
                values: { title },
              })}
            >
              {jsonValue}
            </EuiCodeBlock>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};

function errorMessageLabel(message: string) {
  return i18n.translate('dashboard.exportSource.sanitizeErrorMessage', {
    defaultMessage: 'Error: {message}',
    values: { message },
  });
}
