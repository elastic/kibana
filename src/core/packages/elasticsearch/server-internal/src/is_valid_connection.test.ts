/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Subject } from 'rxjs';
import { errors } from '@elastic/elasticsearch';
import { isValidConnection } from './is_valid_connection';
import { NodesVersionCompatibility } from './version_check/ensure_es_version';

describe('isValidConnection', () => {
  const esNodesCompatibilityRequired: NodesVersionCompatibility = {
    isCompatible: true,
    incompatibleNodes: [],
    warningNodes: [],
    kibanaVersion: '8.0.0',
  };
  const incompatible = {
    ...esNodesCompatibilityRequired,
    isCompatible: false,
    message: 'Something is wrong!',
  };
  const compatible = {
    ...esNodesCompatibilityRequired,
    isCompatible: true,
    message: 'All OK!',
  };
  const errored = {
    ...incompatible,
    nodesInfoRequestError: new errors.ConnectionError('Something went terribly wrong', {} as any),
  };

  test('should resolve only on compatible nodes', async () => {
    const esNodesCompatibility$ = new Subject<NodesVersionCompatibility>();
    const promise = isValidConnection(esNodesCompatibility$);

    esNodesCompatibility$.next(incompatible);
    esNodesCompatibility$.next(errored);
    esNodesCompatibility$.next(compatible);

    await expect(promise).resolves.toStrictEqual(compatible);
  });

  test('should throw an error only on ProductCheckError', async () => {
    const esNodesCompatibility$ = new Subject<NodesVersionCompatibility>();
    const promise = isValidConnection(esNodesCompatibility$);

    const { ProductNotSupportedError, ConnectionError, ConfigurationError } = errors;

    // Emit some other errors declared by the ES client
    esNodesCompatibility$.next({
      ...errored,
      nodesInfoRequestError: new ConnectionError('Something went terribly wrong', {} as any),
    });
    esNodesCompatibility$.next({
      ...errored,
      nodesInfoRequestError: new ConfigurationError('Something went terribly wrong'),
    });

    const productCheckErrored = {
      ...incompatible,
      nodesInfoRequestError: new ProductNotSupportedError({} as any),
    };
    esNodesCompatibility$.next(productCheckErrored);

    await expect(promise).rejects.toThrow(productCheckErrored.nodesInfoRequestError);
  });
});
