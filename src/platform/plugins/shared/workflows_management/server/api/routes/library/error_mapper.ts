/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaResponseFactory } from '@kbn/core/server';
import {
  InstallFormValidationError,
  MissingInstallFormFieldError,
  TemplateParseError,
} from '@kbn/workflows-library';

import {
  LibraryDisabledError,
  LibraryFetchError,
  LibraryNotFoundError,
} from '../../../library/errors';
import { handleRouteError } from '../utils/route_error_handlers';

/**
 * Maps library-layer errors to HTTP responses. Kept separate from the
 * existing `handleRouteError` in `api/routes/utils/route_error_handlers.ts`
 * because library errors are a distinct family (no overlap in classes) and
 * the mapping decisions are local (e.g. `LibraryFetchError(reason='unavailable')`
 * → 503 with a tech-preview-friendly message). Errors outside the family
 * fall through to `handleRouteError` (the install route funnels rendered YAML
 * into the shared create-workflow path, whose errors keep their usual mapping).
 */
export function mapLibraryError(response: KibanaResponseFactory, error: unknown) {
  if (error instanceof LibraryDisabledError) {
    return response.customError({
      statusCode: error.statusCode,
      body: { message: error.message },
    });
  }

  if (error instanceof InstallFormValidationError) {
    // Field-level details travel under `attributes` (the standard error body
    // strips other top-level fields) so the install UI can highlight rows.
    return response.badRequest({
      body: {
        message: error.message,
        attributes: { errors: error.errors },
      },
    });
  }

  if (error instanceof MissingInstallFormFieldError) {
    return response.badRequest({
      body: {
        message: error.message,
        attributes: {
          errors: error.fields.map((field) => ({
            field,
            reason: 'Referenced by the template body but not declared in `install.form`.',
          })),
        },
      },
    });
  }

  if (error instanceof TemplateParseError) {
    // A client-supplied template YAML (e.g. an uploaded file) failed to parse
    // or its metadata is malformed — a 400, not a catalog 404/503.
    return response.badRequest({ body: { message: error.message } });
  }

  if (error instanceof LibraryNotFoundError) {
    return response.notFound({ body: { message: error.message } });
  }

  if (error instanceof LibraryFetchError) {
    // 'unavailable' and 'connection' both mean "upstream not reachable / not
    // ready"; surface as 503 so callers can retry.
    // 'http-error' and 'malformed' mean the upstream gave us something
    // unusable — surface as 503 as well for tech preview (single retry-able
    // status). Promote to 502 later if/when consumers care to distinguish.
    return response.customError({
      statusCode: 503,
      body: { message: error.message },
    });
  }

  if (error instanceof Error) {
    return handleRouteError(response, error);
  }

  return response.customError({
    statusCode: 500,
    body: {
      message: `Internal server error: ${String(error)}`,
    },
  });
}
