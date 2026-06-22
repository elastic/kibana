/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-redeclare */
import { z } from '@kbn/zod/v4'

import { ElasticsearchVersionInfo, Name, RequestBase, Uuid } from './_types'

/**
 * Get cluster info.
 *
 * Get basic build, version, and cluster information.
 * ::: In Serverless, `version.number` always reports the next target Elasticsearch release version at the time of the request. Serverless does not track to a traditional release versioning model; it is continuously updated. The version number is provided to maintain compatibility with existing clients, but it is not meaningful for assessing feature availability. Clients should detect a Serverless environment by checking for `build_flavor: serverless`.
 */
export const InfoRequest = z.object({
  ...RequestBase.shape
}).meta({ id: 'InfoRequest' })
export type InfoRequest = z.infer<typeof InfoRequest>

export const InfoResponse = z.object({
  cluster_name: Name.describe('The responding cluster\'s name.'),
  cluster_uuid: Uuid,
  name: Name.describe('The responding node\'s name.'),
  tagline: z.string(),
  version: ElasticsearchVersionInfo.describe('Version information for the Elasticsearch cluster. In Serverless, `version.number` always reports the next target Elasticsearch release version at the time of the request, not an actual deployed version. The version number is provided to maintain client compatibility but is not meaningful for assessing feature availability. Use `build_flavor: serverless` to detect a Serverless environment.')
}).meta({ id: 'InfoResponse' })
export type InfoResponse = z.infer<typeof InfoResponse>
