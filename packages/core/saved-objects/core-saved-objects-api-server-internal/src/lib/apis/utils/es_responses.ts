/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

/**
 * Type and type guard function for converting a possibly not existent doc to an existent doc.
 */
export type GetResponseFound<TDocument = unknown> = estypes.GetResponse<TDocument> &
  Required<
    Pick<estypes.GetResponse<TDocument>, '_primary_term' | '_seq_no' | '_version' | '_source'>
  >;

export const isFoundGetResponse = <TDocument = unknown>(
  doc: estypes.GetResponse<TDocument>
): doc is GetResponseFound<TDocument> => doc.found;
