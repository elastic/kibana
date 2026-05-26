/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { EuiCallOut, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useDashboardInternalApi } from '../dashboard_api/use_dashboard_internal_api';

export function PanelLimitWarning() {
  const dashboardInternalApi = useDashboardInternalApi();
  const panelLimitState = useObservable(dashboardInternalApi.panelLimitState$);

  const isVisible = Boolean(panelLimitState && !panelLimitState.isValid);

  const messages = useMemo(() => {
    if (!panelLimitState || panelLimitState.isValid) return [];

    const lines: string[] = [];

    if (panelLimitState.topLevel.exceeded) {
      lines.push(
        i18n.translate('dashboard.panelLimit.warning.topLevel', {
          defaultMessage:
            'This dashboard has {count} top-level panels or sections, which exceeds the limit of {max}.',
          values: {
            count: panelLimitState.topLevel.count,
            max: panelLimitState.topLevel.max,
          },
        })
      );
    }

    if (panelLimitState.pinnedPanels.exceeded) {
      lines.push(
        i18n.translate('dashboard.panelLimit.warning.pinnedPanels', {
          defaultMessage: 'This dashboard has {count} controls, which exceeds the limit of {max}.',
          values: {
            count: panelLimitState.pinnedPanels.count,
            max: panelLimitState.pinnedPanels.max,
          },
        })
      );
    }

    if (panelLimitState.sectionViolations.length > 0) {
      // TODO(panel-limit-icons): Add per-section warning icons on section headers once kbn-grid-layout supports section header adornments.
      lines.push(
        i18n.translate('dashboard.panelLimit.warning.sections', {
          defaultMessage:
            '{count, plural, one {# section exceeds the {max}-panel section limit.} other {# sections exceed the {max}-panel section limit.}}',
          values: {
            count: panelLimitState.sectionViolations.length,
            max: panelLimitState.topLevel.max,
          },
        })
      );
    }

    lines.push(
      i18n.translate('dashboard.panelLimit.warning.cannotSave', {
        defaultMessage: 'This dashboard cannot be saved until these issues are resolved.',
      })
    );

    return lines;
  }, [panelLimitState]);

  if (!isVisible) return null;

  return (
    <>
      <EuiCallOut
        color="warning"
        iconType="warning"
        title={i18n.translate('dashboard.panelLimit.warning.title', {
          defaultMessage: 'Dashboard exceeds panel limits',
        })}
        data-test-subj="dashboardPanelLimitWarning"
      >
        <EuiText size="s">
          {messages.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </EuiText>
      </EuiCallOut>
      <EuiSpacer size="s" />
    </>
  );
}
