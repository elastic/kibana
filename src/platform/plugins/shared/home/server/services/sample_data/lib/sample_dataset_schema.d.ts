/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Writable } from '@kbn/utility-types';
import type { TypeOf } from '@kbn/config-schema';
declare const dataIndexSchema: import('@kbn/config-schema').ObjectType<{
  id: import('@kbn/config-schema').Type<string>;
  dataPath: import('@kbn/config-schema').Type<string>;
  fields: import('@kbn/config-schema').Type<Record<string, any>>;
  timeFields: import('@kbn/config-schema').Type<string[]>;
  isDataStream: import('@kbn/config-schema').Type<boolean | undefined>;
  indexSettings: import('@kbn/config-schema').Type<Record<string, any> | undefined>;
  currentTimeMarker: import('@kbn/config-schema').Type<string>;
  preserveDayOfWeekTimeOfDay: import('@kbn/config-schema').Type<boolean>;
}>;
export type DataIndexSchema = TypeOf<typeof dataIndexSchema>;
export declare const sampleDataSchema: import('@kbn/config-schema').ObjectType<{
  id: import('@kbn/config-schema').Type<string>;
  name: import('@kbn/config-schema').Type<string>;
  description: import('@kbn/config-schema').Type<string>;
  previewImagePath: import('@kbn/config-schema').Type<string>;
  darkPreviewImagePath: import('@kbn/config-schema').Type<string | undefined>;
  iconPath: import('@kbn/config-schema').Type<string | undefined>;
  overviewDashboard: import('@kbn/config-schema').Type<string>;
  defaultIndex: import('@kbn/config-schema').Type<string>;
  savedObjects: import('@kbn/config-schema').Type<
    Readonly<
      {
        attributes?: any;
        version?: any;
      } & {
        id: string;
        type: string;
        references: any[];
      }
    >[]
  >;
  dataIndices: import('@kbn/config-schema').Type<
    Readonly<
      {
        isDataStream?: boolean | undefined;
        indexSettings?: Record<string, any> | undefined;
      } & {
        id: string;
        dataPath: string;
        fields: Record<string, any>;
        timeFields: string[];
        currentTimeMarker: string;
        preserveDayOfWeekTimeOfDay: boolean;
      }
    >[]
  >;
  status: import('@kbn/config-schema').Type<string | undefined>;
  statusMsg: import('@kbn/config-schema').Type<string | undefined>;
}>;
export type SampleDatasetSchema = Writable<TypeOf<typeof sampleDataSchema>>;
export {};
