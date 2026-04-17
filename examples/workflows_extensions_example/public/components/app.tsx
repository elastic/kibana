/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import {
  EuiPageTemplate,
  EuiTitle,
  EuiButton,
  EuiSpacer,
  EuiText,
  EuiCallOut,
  EuiFormRow,
  EuiSelect,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
} from '@elastic/eui';
import type { CoreStart, IHttpFetchError } from '@kbn/core/public';
import {
  WORKFLOWS_EXTENSIONS_EXAMPLE_APP_TITLE,
  EMIT_EVENT_ROUTE_PATH,
} from '../../common/constants';
import { CUSTOM_TRIGGER_CATEGORIES } from '../../common/triggers/custom_trigger';

function getErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'body' in err) {
    const body = (err as IHttpFetchError<{ message?: string }>).body;
    if (body && typeof body === 'object' && typeof body.message === 'string') {
      return body.message;
    }
  }
  return err instanceof Error ? err.message : String(err);
}

interface AppDeps {
  http: CoreStart['http'];
}

const CATEGORY_OPTIONS = [
  { value: '', text: '(no category)' },
  ...CUSTOM_TRIGGER_CATEGORIES.map((c) => ({ value: c, text: c })),
];

export const WorkflowsExtensionsExampleApp = ({ http }: AppDeps) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok?: boolean; error?: string } | null>(null);
  const [category, setCategory] = useState<string>('');

  const handleEmitEvent = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await http.post(EMIT_EVENT_ROUTE_PATH, {
        body: JSON.stringify({
          message: 'Emitted from Workflows Extensions Example UI',
          source: 'workflows_extensions_example_app',
          ...(category && { category }),
          labels: ['example', 'demo'],
        }),
      });
      setResult(
        typeof res === 'object' && res && 'ok' in res
          ? { ok: (res as { ok: boolean }).ok }
          : { ok: true }
      );
    } catch (err) {
      setResult({
        error: getErrorMessage(err),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <EuiPageTemplate>
      <EuiPageTemplate.Header>
        <EuiTitle size="l">
          <h1>{WORKFLOWS_EXTENSIONS_EXAMPLE_APP_TITLE}</h1>
        </EuiTitle>
      </EuiPageTemplate.Header>
      <EuiPageTemplate.Section>
        <EuiText>
          <p>
            This example plugin registers custom workflow steps and triggers. Use the button below
            to emit an event for the <code>example.customTrigger</code> trigger. Workflows
            subscribed to that trigger in this space will run.
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiCallOut
          title="Subscribe a workflow to this trigger"
          iconType="info"
          color="primary"
          size="s"
        >
          <p>
            In the Workflows app, create a workflow with trigger type{' '}
            <code>example.customTrigger</code> and enable it. Use <code>with.condition</code> to run
            only for certain categories, e.g. <code>event.category: &quot;alerts&quot;</code>.
          </p>
          <pre style={{ marginBottom: 0, whiteSpace: 'pre-wrap', fontSize: '12px' }}>
            {`name: On custom trigger example
enabled: true
triggers:
  - type: example.customTrigger
    on:
      condition: 'event.category: "alerts"'
steps:
  - name: log_event
    type: console
    with:
      message: "Event: {{ event.message }}"`}
          </pre>
        </EuiCallOut>
        <EuiSpacer size="m" />
        <EuiPanel paddingSize="m" hasBorder hasShadow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="m" wrap={false}>
            <EuiFlexItem grow={false}>
              <EuiFormRow
                label="Category"
                helpText='Workflows can subscribe with condition event.category: "alerts" etc.'
              >
                <EuiSelect
                  options={CATEGORY_OPTIONS}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  compressed
                  style={{ minWidth: 180 }}
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFormRow label=" " hasEmptyLabelSpace>
                <EuiButton
                  fill
                  onClick={handleEmitEvent}
                  isLoading={loading}
                  size="s"
                  style={{ height: 28 }}
                >
                  Emit trigger event
                </EuiButton>
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
        <EuiSpacer size="m" />
        {result !== null && (
          <>
            <EuiSpacer size="m" />
            {result.ok ? (
              <EuiCallOut announceOnMount title="Event emitted" color="success" iconType="check">
                <p>The trigger event was sent. Subscribed workflows in this space will run.</p>
              </EuiCallOut>
            ) : (
              <EuiCallOut announceOnMount title="Emit failed" color="danger" iconType="error">
                <p>{result.error}</p>
              </EuiCallOut>
            )}
          </>
        )}
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
