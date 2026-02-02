/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import {
  EsqlQuery,
  isIdentifier,
  isFunctionExpression,
  isLiteral,
  LeafPrinter,
  SettingNames,
} from '@kbn/esql-language';

/**
 * Extracts the project routing value from an ES|QL query string.
 *
 * @param queryString - The ES|QL query string to parse
 * @returns The project routing value if found, undefined otherwise
 *
 * @example
 * getProjectRoutingFromEsqlQuery('SET project_routing = "_alias:*"; FROM my_index')
 * // Returns: '_alias:*'
 *
 * getProjectRoutingFromEsqlQuery('FROM my_index')
 * // Returns: undefined
 */
export function getProjectRoutingFromEsqlQuery(queryString: string): string | undefined {
  try {
    const parsedQuery = EsqlQuery.fromSrc(queryString);
    const headerInstructions = parsedQuery.ast.header ?? [];

    for (const instruction of headerInstructions) {
      const instructionFunction = instruction.args.find(isFunctionExpression);
      if (!instructionFunction) continue;

      const identifierArg = instructionFunction.args.find(isIdentifier);
      if (identifierArg?.name !== SettingNames.PROJECT_ROUTING) continue;

      const valueArg = instructionFunction.args[1];
      if (!valueArg || Array.isArray(valueArg)) continue;

      if (isLiteral(valueArg)) {
        // For string literals, extract the unquoted value
        if (valueArg.literalType === 'keyword') {
          return valueArg.valueUnquoted;
        }
        // For other literal types, use the printer to get proper string representation
        return LeafPrinter.literal(valueArg);
      }
    }
  } catch (error) {
    // Silently handle parsing errors
  }
  return undefined;
}
