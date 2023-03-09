/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// Copied from https://github.com/elastic/docsmobile/blob/main/docsmobile/template/src/interfaces/registryJsonApi.ts
export interface ElasticMetadata {
  id: string;
  slug: string;
  title: string;
  image?: string;
  description?: string;
  tags?: string[];
  related?: string[];
  date?: string;
  layout?: string;
  link?: string;
  linkPath?: string;
}
