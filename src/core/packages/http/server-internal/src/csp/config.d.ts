/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';
declare const configSchema: import('@kbn/config-schema').ObjectType<{
  disableUnsafeEval: import('@kbn/config-schema').Type<boolean>;
  script_src: import('@kbn/config-schema').Type<string[]>;
  worker_src: import('@kbn/config-schema').Type<string[]>;
  style_src: import('@kbn/config-schema').Type<string[]>;
  connect_src: import('@kbn/config-schema').Type<string[]>;
  default_src: import('@kbn/config-schema').Type<string[]>;
  font_src: import('@kbn/config-schema').Type<string[]>;
  frame_src: import('@kbn/config-schema').Type<string[]>;
  img_src: import('@kbn/config-schema').Type<string[]>;
  object_src: import('@kbn/config-schema').Type<string[]>;
  media_src: import('@kbn/config-schema').Type<string[]>;
  form_action: import('@kbn/config-schema').Type<string[]>;
  frame_ancestors: import('@kbn/config-schema').Type<string[]>;
  report_uri: import('@kbn/config-schema').Type<string[]>;
  report_to: import('@kbn/config-schema').Type<string[]>;
  report_only: import('@kbn/config-schema').Type<
    | Readonly<
        {} & {
          form_action: string[];
          object_src: string[];
          connect_src: string[];
        }
      >
    | undefined
  >;
  strict: import('@kbn/config-schema').Type<boolean>;
  warnLegacyBrowsers: import('@kbn/config-schema').Type<boolean>;
  disableEmbedding: import('@kbn/config-schema').Type<boolean>;
}>;
/**
 * @internal
 */
export type CspConfigType = TypeOf<typeof configSchema>;
/**
 * @internal
 */
export type CspAdditionalConfig = Pick<
  Partial<CspConfigType>,
  | 'connect_src'
  | 'default_src'
  | 'font_src'
  | 'frame_src'
  | 'img_src'
  | 'script_src'
  | 'style_src'
  | 'worker_src'
>;
export declare const cspConfig: ServiceConfigDescriptor<CspConfigType>;
export {};
