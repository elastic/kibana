/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IKibanaResponse, KibanaResponseFactory } from '@kbn/core/server';
import { TransformPanelsInError } from './transforms/in/transform_panels_in_error';

export function writeErrorHandler(error: any, response: KibanaResponseFactory): IKibanaResponse {
  if (error.isBoom && error.output.statusCode === 403) {
    return response.forbidden({ body: { message: error.message } });
  }

  if (error instanceof TransformPanelsInError) {
    return response.custom({
      statusCode: 400,
      bypassErrorFormat: true,
      body: {
        message: 'Bad request',
        panel_errors: (error as TransformPanelsInError).panelErrors.map((panelError) => ({
          message: panelError.message,
          panel_type: panelError.type,
          panel_config: panelError.config,
        })),
      },
    });
  }

  return response.badRequest({ body: { message: error.message } });
}
