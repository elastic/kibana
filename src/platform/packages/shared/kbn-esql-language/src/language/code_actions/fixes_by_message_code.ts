/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { EsqlQuery, mutate } from '@elastic/esql';
import { EsqlSettingNames } from '../../commands/definitions/generated/settings';
import { escapeEsqlColumnName } from '../../commands/definitions/utils/columns';
import { hasWiredStreamsInQuery } from '../../commands/definitions/utils/sources';
import { UnmappedFieldsStrategy } from '../../commands/registry/types';
import { getColumnTypeConflictQuickFixes } from './column_type_conflict';
import type { QuickFix, QuickFixMessage } from './types';

type QuickFixProvider = (message: QuickFixMessage) => QuickFix[];

const loadUnmappedFieldsQuickFix: QuickFix = {
  title: i18n.translate('kbn-esql-language.esql.quickFix.loadUnmappedFields', {
    defaultMessage: 'Load unmapped fields',
  }),
  displayCondition: hasWiredStreamsInQuery,
  fixQuery: (query: string) => {
    const esqlQuery = EsqlQuery.fromSrc(query, { withFormatting: true });
    mutate.commands.set.upsert(
      esqlQuery.ast,
      EsqlSettingNames.UNMAPPED_FIELDS,
      `"${UnmappedFieldsStrategy.LOAD}"`
    );
    return esqlQuery.print({ multiline: true });
  },
};

const wrapInBackticksQuickFix = (message: QuickFixMessage): QuickFix => ({
  title: i18n.translate('kbn-esql-language.esql.quickFix.wrapInBackticks', {
    defaultMessage: 'Wrap identifier in backticks',
  }),
  fixQuery: (query: string) => {
    const { startLineNumber, startColumn, endColumn } = message;
    if (startLineNumber == null || startColumn == null || endColumn == null) return undefined;

    const lines = query.split('\n');
    const line = lines[startLineNumber - 1];
    if (!line) return undefined;

    const rawName = line.slice(startColumn - 1, endColumn - 1);
    if (!rawName) return undefined;

    const quoted = escapeEsqlColumnName(rawName);
    lines[startLineNumber - 1] =
      line.slice(0, startColumn - 1) + quoted + line.slice(endColumn - 1);
    return lines.join('\n');
  },
});

const fixesByMessageCode: Partial<Record<string, QuickFixProvider>> = {
  unknownColumn: () => [loadUnmappedFieldsQuickFix],
  columnTypeConflict: getColumnTypeConflictQuickFixes,
  invalidUnquotedIdentifier: (message) => [wrapInBackticksQuickFix(message)],
};

export const getQuickFixesByMessageCode = (message: QuickFixMessage): QuickFix[] =>
  fixesByMessageCode[message.code]?.(message) ?? [];
