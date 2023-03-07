/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface ESProcessorConfig {
  on_failure?: Processor[];
  ignore_failure?: boolean;
  if?: string;
  tag?: string;
  [key: string]: unknown;
}

export interface Processor {
  [typeName: string]: ESProcessorConfig;
}

export interface Pipeline {
  name: string;
  description?: string;
  version?: number;
  processors: string | Processor[];
  on_failure?: Processor[];
  isManaged?: boolean;
}
