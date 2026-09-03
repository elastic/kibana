/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const PROFILING_DOCS_URL =
  'https://www.elastic.co/guide/en/observability/current/universal-profiling.html';

/**
 * Empty state for the flyout's "Profiling" tab. Profiling data isn't seeded
 * in the lab, so the tab surfaces the same "Add Universal Profiling" promo the
 * real Observability app shows before an integration is enabled — that way the
 * tab always has meaningful content to render even when no profiles exist.
 *
 * Both CTAs are illustrative: "Add profiling" is inert (lab prototype) and
 * "Go to docs" deep-links to the public Universal Profiling docs.
 */
export const ProfilingTab = () => (
  <EuiPanel hasBorder paddingSize="l">
    <EuiFlexGroup alignItems="center" gutterSize="xl" responsive={false}>
      <EuiFlexItem>
        <EuiTitle size="m">
          <h2>
            {i18n.translate('entityCentricLabFlyout.flyout.profiling.title', {
              defaultMessage:
                'Improve computational efficiency. Debug performance regressions. Reduce cloud spend.',
            })}
          </h2>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate('entityCentricLabFlyout.flyout.profiling.body', {
              defaultMessage:
                'Elastic Universal Profiling is a whole-system, always-on, continuous profiling solution that eliminates the need for code instrumentation, recompilation, on-host debug symbols, or service restarts. Leveraging eBPF, Universal Profiling operates within the Linux kernel space, capturing only the needed data with minimal overhead in an unobtrusive manner.',
            })}
          </p>
        </EuiText>
        <EuiSpacer size="l" />
        <EuiFlexGroup alignItems="center" gutterSize="l" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButton fill data-test-subj="entityCentricLabProfilingAddButton">
              {i18n.translate('entityCentricLabFlyout.flyout.profiling.addButton', {
                defaultMessage: 'Add profiling',
              })}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiLink href={PROFILING_DOCS_URL} target="_blank" external>
              {i18n.translate('entityCentricLabFlyout.flyout.profiling.docsLink', {
                defaultMessage: 'Go to docs',
              })}
            </EuiLink>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiIcon type="node" size="xxl" color="subdued" />
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);
