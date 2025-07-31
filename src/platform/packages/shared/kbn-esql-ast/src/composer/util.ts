/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Builder } from '../builder';
import { ParameterHole } from './parameter_hole';
import { ComposerQueryTagHole } from './types';

/**
 * Query composer allows only named ES|QL parameters, because you cannot
 * mix named and positional, or named and anonymous parameters in the same query.
 *
 * @param name The name of the parameter to validate.
 */
export const validateParamName = (name: string): void => {
  if (typeof name !== 'string' || !name) {
    throw new Error('Unnamed parameters are not allowed');
  }

  if (/^[0-9 ]/.test(name)) {
    throw new Error(
      `Invalid parameter name "${name}". Parameter names cannot start with a digit or space.`
    );
  }
};

export const processTemplateHoles = (
  holes: ComposerQueryTagHole[],
  params: Map<string, unknown> = new Map()
) => {
  const length = holes.length;

  for (let i = 0; i < length; i++) {
    const hole = holes[i];

    if (hole instanceof ParameterHole) {
      const name = hole.name ?? `p${params.size}`;

      validateParamName(name);

      const param = Builder.param.named({ value: name });

      holes[i] = param;
      params.set(name, hole.value);
    }
  }

  return {
    params,
  };
};
