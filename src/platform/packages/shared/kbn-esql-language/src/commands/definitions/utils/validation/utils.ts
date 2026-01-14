/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildSignatureTypes } from '../errors';
import { buildFunctionLookup } from '../functions';

// used for testing... eventually should be moved to the __tests__ directory once
// kbn-esql-language is merged into this package and this no longer
// has to be exported from this package
export const getNoValidCallSignatureError = (fnName: string, givenTypes: string[]) => {
  const definition = buildFunctionLookup().get(fnName)!;
  return `Invalid input types for ${fnName.toUpperCase()}.

Received (${givenTypes.join(', ')}).

Expected one of:\n  ${[...definition.signatures]
    .sort((a, b) => a.params.length - b.params.length)
    .map((sig) => `- (${buildSignatureTypes(sig)})`)
    .join('\n  ')}`;
};
