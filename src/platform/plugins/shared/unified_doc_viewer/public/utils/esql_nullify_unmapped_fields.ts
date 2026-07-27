/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser, BasicPrettyPrinter } from '@elastic/esql';

/**
 * Predicates derived from a document (e.g. `error.culprit`) may reference fields
 * that are not mapped in the target index pattern. Nullifying unmapped fields
 * degrades those predicates to `null` instead of failing hard with
 * `verification_exception: Unknown column [...]`.
 */
export const ESQL_NULLIFY_UNMAPPED_FIELDS = 'SET unmapped_fields="nullify";';

/**
 * Prepends the `SET unmapped_fields="nullify"` header to an ES|QL query and
 * returns it as a single line.
 *
 * Discover discards the header command when the query handed to `openInNewTab`
 * spans multiple lines (the `SET` ends up on its own line and gets dropped),
 * which makes the "Open in Discover tab" action run without the directive and
 * fail with `verification_exception`. Emitting a single-line query mirrors the
 * working pattern used by the metrics and trace charts.
 */
export const withNullifyUnmappedFields = (esqlQuery: string): string => {
  const { root } = Parser.parse(esqlQuery);
  return `${ESQL_NULLIFY_UNMAPPED_FIELDS} ${BasicPrettyPrinter.print(root)}`;
};
