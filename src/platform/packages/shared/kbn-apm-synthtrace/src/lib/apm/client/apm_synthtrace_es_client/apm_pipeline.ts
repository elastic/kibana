/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { pipeline, Readable } from 'stream';
import { getSerializeTransform } from '../../../shared/get_serialize_transform';
import { Logger } from '../../../utils/create_logger';
import { getApmServerPipeline } from './get_apm_server_pipeline';
import { getOtelPipeline } from './otel/get_apm_otel_pipeline';
import { conditionalStreams } from '../../../utils/stream_utils';

export function apmPipeline(logger: Logger, version: string, includeSerialization: boolean = true) {
  return (base: Readable) => {
    const serializationTransform = includeSerialization ? [getSerializeTransform()] : [];

    return pipeline(
      // @ts-expect-error Some weird stuff here with the type definition for pipeline. We have tests!
      base,
      ...serializationTransform,
      conditionalStreams((chunk) => !!chunk.span_id, getOtelPipeline()),
      conditionalStreams((chunk) => !!chunk['agent.name'], getApmServerPipeline(version)),
      (err) => {
        if (err) {
          logger.error(err);
        }
      }
    );
  };
}
