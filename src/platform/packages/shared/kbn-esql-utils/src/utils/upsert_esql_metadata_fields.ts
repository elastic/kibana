/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isColumn, isOptionNode, isSource, Parser } from '@elastic/esql';
import type { ESQLAstItem, ESQLCommandOption } from '@elastic/esql/types';

const SUPPORTED_SOURCE_COMMANDS = new Set(['from', 'ts']);

const findMetadataOption = (args: ESQLAstItem[]): ESQLCommandOption | undefined => {
  for (const arg of args) {
    if (!Array.isArray(arg) && isOptionNode(arg) && arg.name === 'metadata') {
      return arg;
    }
  }
};

/** Adds missing metadata fields to a top-level FROM or TS command without reformatting the query. */
export const upsertESQLMetadataFields = (
  esql: string,
  metadataFields: readonly string[]
): string => {
  try {
    const { errors, root } = Parser.parse(esql);
    const sourceCommand = root.commands[0];

    if (
      errors.length > 0 ||
      !sourceCommand ||
      root.commands.some(({ incomplete }) => incomplete) ||
      !SUPPORTED_SOURCE_COMMANDS.has(sourceCommand.name) ||
      !sourceCommand.args.some(isSource)
    ) {
      return esql;
    }

    const metadataOption = findMetadataOption(sourceCommand.args);

    if (metadataOption?.incomplete) {
      return esql;
    }

    const existingFields = new Set(
      metadataOption?.args.filter(isColumn).map(({ name }) => name) ?? []
    );
    const missingFields = [...new Set(metadataFields)].filter(
      (field) => !existingFields.has(field)
    );

    if (missingFields.length === 0) {
      return esql;
    }

    const insertAt = (metadataOption ?? sourceCommand).location.max + 1;
    const insertion = metadataOption
      ? `, ${missingFields.join(', ')}`
      : ` METADATA ${missingFields.join(', ')}`;

    return `${esql.slice(0, insertAt)}${insertion}${esql.slice(insertAt)}`;
  } catch {
    return esql;
  }
};
