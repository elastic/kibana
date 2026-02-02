/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import uniqBy from 'lodash/uniqBy';
import { LeafPrinter } from '../../../pretty_print/leaf_printer';
import { type ESQLAstChangePointCommand, type ESQLCommand } from '../../../types';
import type { ESQLColumnData } from '../types';

export const columnsAfter = (
  command: ESQLCommand,
  previousColumns: ESQLColumnData[],
  query: string
) => {
  const { target } = command as ESQLAstChangePointCommand;

  let typeField: ESQLColumnData;
  let pvalueField: ESQLColumnData;

  if (target?.type) {
    typeField = {
      name: LeafPrinter.column(target.type),
      type: 'keyword' as const,
      userDefined: true,
      location: target.type.location,
    };
  } else {
    typeField = {
      name: 'type',
      type: 'keyword' as const,
      userDefined: false,
    };
  }

  if (target?.pvalue) {
    pvalueField = {
      name: LeafPrinter.column(target.pvalue),
      type: 'double' as const,
      userDefined: true,
      location: target.pvalue.location,
    };
  } else {
    pvalueField = {
      name: 'pvalue',
      type: 'double' as const,
      userDefined: false,
    };
  }

  return uniqBy([...previousColumns, typeField, pvalueField], 'name');
};
