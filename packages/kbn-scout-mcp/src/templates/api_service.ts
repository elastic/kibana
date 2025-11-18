/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface ApiServiceOptions {
  serviceName: string;
  description: string;
  basePath: string;
  methods: Array<{
    name: string;
    description?: string;
    httpMethod: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    path: string;
    hasBody?: boolean;
    returns?: string;
  }>;
}

export function generateApiService(options: ApiServiceOptions): string {
  const { serviceName, description, basePath, methods } = options;

  const interfaceName = `${serviceName}ApiService`;
  const functionName = `get${serviceName}ApiService`;

  const interfaceMethods = methods
    .map((method) => {
      const params = method.hasBody ? `data: any` : '';
      const returnType = method.returns || 'void';
      const comment = method.description ? `  /** ${method.description} */\n  ` : '  ';
      return `${comment}${method.name}: (${params}) => Promise<${returnType}>;`;
    })
    .join('\n  ');

  const implementationMethods = methods
    .map((method) => {
      const params = method.hasBody ? `data` : '';
      const bodyParam = method.hasBody ? `,\n          body: data,` : '';
      return `    ${method.name}: async (${params}) => {
      return measurePerformanceAsync(log, '${serviceName}.${method.name}', async () => {
        const response = await kbnClient.request({
          method: '${method.httpMethod}',
          path: \`\${basePath}${method.path}\`${bodyParam}
        });
        return response.data;
      });
    }`;
    })
    .join(',\n\n');

  return `/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KbnClient, ScoutLogger, ScoutParallelWorkerFixtures, EsClient } from '@kbn/scout';
import { measurePerformanceAsync } from '@kbn/scout';

const ${serviceName.toUpperCase()}_API_PATH = '${basePath}';

/**
 * ${description}
 */
export interface ${interfaceName} {
  ${interfaceMethods}
}

/**
 * Creates ${serviceName} API service
 */
export const ${functionName} = ({
  kbnClient,
  log,
  scoutSpace,
  esClient,
}: {
  kbnClient: KbnClient;
  log: ScoutLogger;
  scoutSpace?: ScoutParallelWorkerFixtures['scoutSpace'];
  esClient: EsClient;
}): ${interfaceName} => {
  const basePath = scoutSpace?.id ? \`/s/\${scoutSpace.id}\` : '';

  return {
${implementationMethods}
  };
};
`;
}
