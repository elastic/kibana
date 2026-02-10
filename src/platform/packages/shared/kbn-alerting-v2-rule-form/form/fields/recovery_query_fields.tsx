/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useEffect, useRef } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useWatch, type Control, type UseFormSetValue } from 'react-hook-form';
import { Parser } from '@kbn/esql-language';
import type { ESQLSource } from '@kbn/esql-language';
import type { FormValues } from '../types';
import type { RuleFieldsServices } from '../rule_fields';
import { ESQLEditorField } from './esql_editor_field';
import { WhereClauseEditor } from './where_clause_editor';

export interface RecoveryQueryFieldsProps {
  control: Control<FormValues>;
  setValue: UseFormSetValue<FormValues>;
  services: RuleFieldsServices;
}

/**
 * Extracts the full FROM clause from an ES|QL query using AST parsing.
 *
 * For example, the query: `FROM logs-*, metrics-* | WHERE host.name == "server1"`
 * Returns: `"FROM logs-*, metrics-*"`
 *
 * @param query - The ES|QL query string
 * @returns The full FROM clause string (e.g., "FROM logs-*, metrics-*"), or empty string if not found
 */
const getFromClauseFromQuery = (query: string): string => {
  if (!query) {
    return '';
  }

  try {
    // Parse the query string into an AST (Abstract Syntax Tree)
    const { root, errors } = Parser.parse(query);

    // If there are parse errors, bail out early
    if (errors.length > 0) {
      return '';
    }

    // Find the FROM or TS command (source command)
    const sourceCommand = root.commands.find(({ name }) => ['from', 'ts'].includes(name));
    if (!sourceCommand) {
      return '';
    }

    // Extract index sources from the command arguments
    const args = sourceCommand.args as ESQLSource[];
    const sources = args
      .filter((arg): arg is ESQLSource => arg.sourceType === 'index')
      .map((index) => index.name);

    if (sources.length === 0) {
      return '';
    }

    // Construct the FROM clause with proper spacing
    const commandName = sourceCommand.name.toUpperCase();
    return `${commandName} ${sources.join(', ')}`;
  } catch {
    return '';
  }
};

/**
 * Reusable component containing the recovery query fields:
 * - ES|QL base query editor
 * - WHERE clause condition editor
 *
 * Can be used in flyouts, dedicated pages, or any other context.
 */
export const RecoveryQueryFields: React.FC<RecoveryQueryFieldsProps> = ({
  control,
  setValue,
  services,
}) => {
  // Get the main ES|QL query from form state
  const query = useWatch({ control, name: 'query' });
  // Get the current recovery base query value
  const recoveryBaseQuery = useWatch({ control, name: 'recovery_policy.query.base' });

  // Track whether we've initialized the base query to avoid overwriting user edits
  const hasInitializedRef = useRef(false);

  // Extract the full FROM clause from the main query using AST parsing
  // e.g., "FROM logs-*, metrics-*"
  const fromClause = useMemo(() => {
    return getFromClauseFromQuery(query);
  }, [query]);

  // Set the recovery base query to the FROM clause when it's first available
  // Only initialize once to avoid overwriting user edits
  useEffect(() => {
    if (fromClause && !hasInitializedRef.current && !recoveryBaseQuery) {
      setValue('recovery_policy.query.base', fromClause);
      hasInitializedRef.current = true;
    }
  }, [fromClause, recoveryBaseQuery, setValue]);

  return (
    <>
      <ESQLEditorField
        control={control}
        name="recovery_policy.query.base"
        label={i18n.translate('xpack.esqlRuleForm.recoveryQueryLabel', {
          defaultMessage: 'Recovery query',
        })}
        helpText={i18n.translate('xpack.esqlRuleForm.recoveryQueryHelpText', {
          defaultMessage: 'ES|QL query to determine when alerts should recover.',
        })}
        services={services}
      />
      <EuiSpacer size="m" />
      <WhereClauseEditor
        control={control}
        name="recovery_policy.query.condition"
        label={i18n.translate('xpack.esqlRuleForm.recoveryConditionLabel', {
          defaultMessage: 'Recovery condition',
        })}
        helpText={i18n.translate('xpack.esqlRuleForm.recoveryConditionHelpText', {
          defaultMessage:
            'WHERE clause condition to filter when alerts recover (e.g., status == "resolved").',
        })}
      />
    </>
  );
};
