/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { filter } from 'rxjs/operators';
import { errors } from '@elastic/elasticsearch';
import { firstValueFrom, Observable } from 'rxjs';
import { NodesVersionCompatibility } from './version_check/ensure_es_version';

/**
 * Validates the output of the ES Compatibility Check and waits for a valid connection.
 * It may also throw on specific config/connection errors to make Kibana halt.
 *
 * @param esNodesCompatibility$ ES Compatibility Check's observable
 *
 * @remarks: Ideally, this will be called during the start lifecycle to figure
 * out any configuration issue as soon as possible.
 */
export async function isValidConnection(
  esNodesCompatibility$: Observable<NodesVersionCompatibility>
): Promise<NodesVersionCompatibility> {
  return firstValueFrom(
    esNodesCompatibility$.pipe(
      filter(({ nodesInfoRequestError, isCompatible }) => {
        if (
          nodesInfoRequestError &&
          nodesInfoRequestError instanceof errors.ProductNotSupportedError
        ) {
          // Throw on the specific error of ProductNotSupported.
          // We explicitly want Kibana to halt in this case.
          throw nodesInfoRequestError;
        }
        return isCompatible;
      })
    )
  );
}
