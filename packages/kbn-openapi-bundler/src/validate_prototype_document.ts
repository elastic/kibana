/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import chalk from 'chalk';
import { PrototypeDocument } from './prototype_document';
import { readDocument } from './utils/read_document';

/**
 * Validates that passed `prototypeDocument` fulfills the requirements.
 *
 * In particular security requirements must be specified via `security` and
 * `components.securitySchemes` properties.
 *
 */
export async function validatePrototypeDocument(
  prototypeDocumentOrString: PrototypeDocument | string
): Promise<PrototypeDocument> {
  const prototypeDocument: PrototypeDocument | undefined =
    typeof prototypeDocumentOrString === 'string'
      ? await readDocument(prototypeDocumentOrString)
      : prototypeDocumentOrString;

  if (prototypeDocument.servers && !Array.isArray(prototypeDocument.servers)) {
    throw new Error(`Prototype document's ${chalk.bold('servers')} must be an array`);
  }

  if (prototypeDocument.servers && prototypeDocument.servers.length === 0) {
    throw new Error(
      `Prototype document's ${chalk.bold('servers')} should have as minimum one entry`
    );
  }

  if (prototypeDocument.security && !Array.isArray(prototypeDocument.security)) {
    throw new Error(`Prototype document's ${chalk.bold('security')} must be an array`);
  }

  if (prototypeDocument.security && prototypeDocument.security.length === 0) {
    throw new Error(
      `Prototype document's ${chalk.bold('security')} should have as minimum one entry`
    );
  }

  if (prototypeDocument.tags && !Array.isArray(prototypeDocument.tags)) {
    throw new Error(`Prototype document's ${chalk.bold('tags')} must be an array`);
  }

  if (prototypeDocument.tags && prototypeDocument.tags.length === 0) {
    throw new Error(`Prototype document's ${chalk.bold('tags')} should have as minimum one entry`);
  }

  if (prototypeDocument.security && !prototypeDocument.components?.securitySchemes) {
    throw new Error(
      `Prototype document must contain ${chalk.bold(
        'components.securitySchemes'
      )} when security requirements are specified`
    );
  }

  if (prototypeDocument.components?.securitySchemes && !prototypeDocument.security) {
    throw new Error(
      `Prototype document must have ${chalk.bold('security')} defined ${chalk.bold(
        'components.securitySchemes'
      )} are specified`
    );
  }

  return prototypeDocument;
}
