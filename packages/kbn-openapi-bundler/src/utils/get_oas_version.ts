/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import chalk from 'chalk';
import { ResolvedDocument } from '../bundler/ref_resolver/resolved_document';

export function getOasVersion(resolvedDocument: ResolvedDocument): string {
  if (typeof resolvedDocument.document.openapi !== 'string') {
    throw new Error(
      `OpenAPI version field is not a string in ${chalk.yellow(resolvedDocument.absolutePath)}`
    );
  }

  const version = resolvedDocument.document.openapi;

  // Automatically promote to the recent OAS 3.0 version which is 3.0.3
  // 3.0.3 is the version used in the specification https://swagger.io/specification/v3/
  return version < '3.0.3' ? '3.0.3' : version;
}
