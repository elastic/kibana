/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Readable, pipeline } from 'stream';
import { Logger } from '../../../../utils/create_logger';
import { getSerializeTransform } from '../../../../shared/get_serialize_transform';
import { getIntakeDefaultsTransform } from '../get_intake_defaults_transform';
import { getApmServerMetadataTransform } from '../get_apm_server_metadata_transform';
import { getOtelToApmSpanTransform } from './get_apm_to_otel_span_transform';
import { getOtelTransforms } from './otel_to_apm_pipeline';

export function apmToOtelPipeline(
  logger: Logger,
  version: string,
  includeSerialization: boolean = true
) {
  return (base: Readable) => {
    const serializationTransform = includeSerialization ? [getSerializeTransform()] : [];

    return pipeline(
      base,
      // @ts-expect-error Some weird stuff here with the type definition for pipeline. We have tests!
      ...serializationTransform,
      getIntakeDefaultsTransform(),
      getApmServerMetadataTransform(version),
      getOtelToApmSpanTransform(),
      ...getOtelTransforms(),
      (err) => {
        if (err) {
          logger.error(err);
        }
      }
    );
  };
}
