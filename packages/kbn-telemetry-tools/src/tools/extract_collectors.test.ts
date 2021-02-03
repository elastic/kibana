/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import * as ts from 'typescript';
import * as path from 'path';
import { extractCollectors, getProgramPaths } from './extract_collectors';
import { parseTelemetryRC } from './config';
import { allExtractedCollectors } from './__fixture__/all_extracted_collectors';

describe('extractCollectors', () => {
  it('extracts collectors given rc file', async () => {
    const configRoot = path.join(process.cwd(), 'src', 'fixtures', 'telemetry_collectors');
    const tsConfig = ts.findConfigFile('./', ts.sys.fileExists, 'tsconfig.json');
    if (!tsConfig) {
      throw new Error('Could not find a valid tsconfig.json.');
    }
    const configs = await parseTelemetryRC(configRoot);
    expect(configs).toHaveLength(1);
    const programPaths = await getProgramPaths(configs[0]);

    const results = [...extractCollectors(programPaths, tsConfig)];
    expect(results).toHaveLength(8);
    expect(results).toStrictEqual(allExtractedCollectors);
  });
});
