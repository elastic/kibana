/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpStart } from '@kbn/core/public';
import { DeleteObjectBodyHTTPV1, DeleteObjectResponseHTTPV1 } from '../../common/types';

export async function deleteObject(
  http: HttpStart,
  object: DeleteObjectBodyHTTPV1
): Promise<DeleteObjectResponseHTTPV1> {
  return await http.delete<DeleteObjectResponseHTTPV1>(
    `/api/kibana/management/saved_objects/_delete`,
    { body: JSON.stringify(object) }
  );
}
