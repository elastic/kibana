/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UrlParts } from '@kbn/test';

class Config {
  private data: Record<string, any>;

  constructor(data: Record<string, any>) {
    this.data = data;
  }

  get(path: string): any {
    return path.split('.').reduce((acc, key) => {
      if (acc && typeof acc === 'object') {
        return acc[key];
      }
      return undefined;
    }, this.data);
  }
}

interface ConfigType {
  servers: {
    kibana: UrlParts;
    elasticsearch: UrlParts;
  };
  esTestCluster: {
    serverArgs: string[];
  };
  kbnTestServer: {
    buildArgs: string[];
    sourceArgs: string[];
    serverArgs: string[];
  };
}
