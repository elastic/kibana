/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import chalk from 'chalk';
import { PrototypeDocument } from './prototype_document';

/**
 * Validates that passed `prototypeDocument` fulfills the requirements.
 *
 * In particular security requirements must be specified via `security` and
 * `components.securitySchemes` properties.
 *
 */
export function validatePrototypeDocument(prototypeDocument: PrototypeDocument | undefined): void {
  if (prototypeDocument === undefined) {
    return;
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
}
