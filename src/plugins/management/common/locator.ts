/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializableRecord } from '@kbn/utility-types';
import { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/common';
import { MANAGEMENT_APP_LOCATOR } from '@kbn/deeplinks-management/constants';
import { MANAGEMENT_APP_ID } from './contants';

export type ManagementAppLocatorParams = SerializableRecord &
  (
    | {
        sectionId: string;
        appId?: string;
      }
    | {
        componentTemplate: string;
      }
    | {
        indexTemplate: string;
      }
    | {
        pipeline: string;
      }
  );

export type ManagementAppLocator = LocatorPublic<ManagementAppLocatorParams>;

export class ManagementAppLocatorDefinition
  implements LocatorDefinition<ManagementAppLocatorParams>
{
  public readonly id = MANAGEMENT_APP_LOCATOR;

  public readonly getLocation = async (params: ManagementAppLocatorParams) => {
    const path = buildPathFromParams(params);

    return {
      app: MANAGEMENT_APP_ID,
      path,
      state: {},
    };
  };
}

const buildPathFromParams = (params: ManagementAppLocatorParams) => {
  if (params.sectionId) {
    return `/${params.sectionId}${params.appId ? '/' + params.appId : ''}`;
  }

  if (params.indexTemplate) {
    return `/data/index_management/templates/${params.indexTemplate}`;
  }

  if (params.componentTemplate) {
    return `/data/index_management/component_templates/${params.componentTemplate}`;
  }

  if (params.pipeline) {
    return `/ingest/ingest_pipelines/?pipeline=${params.pipeline}`;
  }

  return '/';
};
