/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import chalk from 'chalk';
import { ResolvedDocument } from '../bundler/ref_resolver/resolved_document';
import { isPlainObjectType } from './is_plain_object_type';

export function getOasDocumentVersion(resolvedDocument: ResolvedDocument): string {
  if (!isPlainObjectType(resolvedDocument.document.info)) {
    throw new Error(
      `Required info object is not found in ${chalk.yellow(resolvedDocument.absolutePath)}`
    );
  }

  if (typeof resolvedDocument.document.info.version !== 'string') {
    throw new Error(
      `Required info.version is not a string in ${chalk.yellow(resolvedDocument.absolutePath)}`
    );
  }

  return resolvedDocument.document.info.version;
}
