/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiSkeletonText,
  EuiSpacer,
  EuiTitle,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ESQLVariableType, type ESQLControlVariable } from '@kbn/esql-types';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { MAX_STATE_STRING_LENGTH, type StateValue } from '@kbn/custom-app-common';
import type {
  CapabilityNodeOf,
  CapabilityQueryResult as CustomAppQueryResult,
  CapabilityViewProps as CustomAppCapabilityViewProps,
} from '@kbn/custom-app-registry';
import { ESQLLangEditor } from '../../create_editor';
import type { esqlEditorCapability } from '../../../common/custom_app/esql_editor/manifest';

type Result =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: CustomAppQueryResult }
  | { status: 'error'; message: string };

/** How long typing pauses before the text is kept in the value of the app it is bound to. */
const BIND_DEBOUNCE_MS = 300;

const NUMBER_TYPES = new Set([
  'long',
  'integer',
  'short',
  'byte',
  'double',
  'float',
  'unsigned_long',
]);

/** What the editor needs to suggest the values of the app while a query is typed. */
const toVariables = (values: Readonly<Record<string, StateValue>>): ESQLControlVariable[] =>
  Object.entries(values).flatMap(([key, value]) =>
    typeof value === 'string' || typeof value === 'number'
      ? [{ key, value, type: ESQLVariableType.VALUES }]
      : []
  );

const toMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const formatCell = (value: unknown, type: string): string => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number' && NUMBER_TYPES.has(type)) {
    return new Intl.NumberFormat(i18n.getLocale()).format(value);
  }
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
};

/**
 * An ES|QL editor for the people using the app, with the table of what their query returns. The
 * query is theirs, so it is not one that the app knows about: it runs here, as the person who is
 * looking, with the period, the filters and the values of the app.
 */
export const EsqlEditorView = ({
  node,
  text: interpolateText,
  context,
  state,
  runQuery,
  setValue,
}: CustomAppCapabilityViewProps<CapabilityNodeOf<typeof esqlEditorCapability>>) => {
  const [text, setText] = useState(node.query);
  const [result, setResult] = useState<Result>({ status: 'idle' });
  const controller = useRef<AbortController>();
  const latest = useRef({ text, runQuery, state });
  latest.current = { text, runQuery, state };

  const run = useCallback(async () => {
    const { text: query, runQuery: execute } = latest.current;
    if (query.trim() === '') return;
    controller.current?.abort();
    const next = new AbortController();
    controller.current = next;
    setResult({ status: 'loading' });
    try {
      const data = await execute(query, next.signal);
      if (!next.signal.aborted) setResult({ status: 'success', data });
    } catch (error) {
      if (!next.signal.aborted) setResult({ status: 'error', message: toMessage(error) });
    }
  }, []);

  useEffect(() => () => controller.current?.abort(), []);

  const { bind } = node;
  useEffect(() => {
    if (bind === undefined || text.length > MAX_STATE_STRING_LENGTH) return undefined;
    const timer = setTimeout(() => {
      if (String(latest.current.state[bind] ?? '') !== text) setValue(bind, text);
    }, BIND_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [bind, text, setValue]);

  const columns = useMemo<Array<EuiBasicTableColumn<Record<string, unknown>>>>(
    () =>
      result.status === 'success'
        ? result.data.columns.map(({ name, type }, index) => ({
            field: `c${index}`,
            name,
            sortable: true,
            render: (value: unknown) => formatCell(value, type),
          }))
        : [],
    [result]
  );
  const items = useMemo(
    () =>
      result.status === 'success'
        ? result.data.rows.map((row) =>
            Object.fromEntries(row.map((value, index) => [`c${index}`, value]))
          )
        : [],
    [result]
  );

  return (
    <div data-node-id={node.id} data-test-subj="customAppEsqlEditor">
      {node.title ? (
        <>
          <EuiTitle size="xxs">
            <h4>{interpolateText(node.title)}</h4>
          </EuiTitle>
          <EuiSpacer size="xs" />
        </>
      ) : null}
      <ESQLLangEditor
        query={{ esql: text }}
        onTextLangQueryChange={(next) => setText(next.esql)}
        onTextLangQuerySubmit={async () => run()}
        editorIsInline
        hasOutline
        hideRunQueryButton
        hideQueryHistory
        disableAutoFocus
        initialState={{ editorHeight: 160 }}
        errors={[]}
        esqlVariables={toVariables(state)}
      />
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            fill
            iconType="playFilled"
            onClick={run}
            isLoading={result.status === 'loading'}
            isDisabled={!context || text.trim() === ''}
            data-test-subj="customAppEsqlEditorRun"
          >
            {i18n.translate('xpack.customAppEsql.run', { defaultMessage: 'Run' })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {result.status === 'loading' ? <EuiSkeletonText lines={3} isLoading /> : null}
      {result.status === 'error' ? (
        <KbnDangerCallout
          announceOnMount={false}
          size="s"
          title={i18n.translate('xpack.customAppEsql.errorTitle', {
            defaultMessage: 'The query could not run',
          })}
        >
          <p>{result.message}</p>
        </KbnDangerCallout>
      ) : null}
      {result.status === 'success' ? (
        <EuiInMemoryTable
          items={items}
          columns={columns}
          pagination={{ pageSizeOptions: [10, 25, 50] }}
          sorting
          tableCaption={i18n.translate('xpack.customAppEsql.caption', {
            defaultMessage: 'The result of the query',
          })}
          noItemsMessage={i18n.translate('xpack.customAppEsql.noRows', {
            defaultMessage: 'The query returned no rows.',
          })}
          data-test-subj="customAppEsqlEditorResult"
        />
      ) : null}
    </div>
  );
};
