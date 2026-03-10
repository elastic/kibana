/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { sep } from 'path';
import type { TypeOf } from '@kbn/config-schema';
import type {
  IKibanaResponse,
  KibanaRequest,
  KibanaResponseFactory,
  Logger,
} from '@kbn/core/server';
import { REPO_ROOT } from '@kbn/repo-info';
import { schema } from '@kbn/config-schema';
import { getComponentCodeowners } from '../../lib/codeowners/get_component_codeowners';

export const getComponentDataBodySchema = schema.object({
  path: schema.string({
    minLength: 1,
  }),
});

export type GetComponentDataRequestBody = TypeOf<typeof getComponentDataBodySchema>;

/**
 * Options for {@link getComponentData}.
 */
interface GetComponentDataOptions {
  /** {@link KibanaRequest} */
  req: KibanaRequest<unknown, unknown, GetComponentDataRequestBody>;
  /** {@link KibanaResponseFactory} */
  res: KibanaResponseFactory;
  /** {@link Logger} */
  logger: Logger;
}

/**
 * Response structure for {@link getComponentData}.
 */
export interface GetComponentDataResponse {
  /** List of codeowners for the component. */
  codeowners: string[];
  /** Path relative to the repo root. */
  relativePath: string;
  /** File name with extension. */
  baseFileName: string;
}

/**
 * Get data about a component at a given path.
 * @async
 * @internal
 * @param {GetComponentDataOptions} options
 * @param {KibanaRequest<unknown, unknown, GetComponentDataRequestBody>} options.req {@link KibanaRequest}
 * @param {KibanaResponseFactory} options.res {@link KibanaResponseFactory}
 * @param {Logger} options.logger {@link Logger}
 * @returns {Promise<IKibanaResponse<GetComponentDataResponse>>} Resolves with {@link GetComponentDataResponse component data}.
 */
export const getComponentData = async ({
  req,
  res,
  logger,
}: GetComponentDataOptions): Promise<IKibanaResponse<GetComponentDataResponse>> => {
  const { path } = req.body;

  logger.debug(`Inspecting component at path: ${path}`);

  const relativePath = path.slice(REPO_ROOT.length + sep.length);
  const baseFileName = relativePath.split(sep).pop() || '';

  const codeowners = getComponentCodeowners(relativePath);

  return res.ok<GetComponentDataResponse>({ body: { codeowners, relativePath, baseFileName } });
};
