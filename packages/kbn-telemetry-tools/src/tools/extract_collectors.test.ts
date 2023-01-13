/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as ts from 'typescript';
import * as path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { extractCollectors, getProgramPaths } from './extract_collectors';
import { parseTelemetryRC } from './config';
import { allExtractedCollectors } from './__fixture__/all_extracted_collectors';

describe('extractCollectors', () => {
  it('extracts collectors given rc file', async () => {
    const configRoot = path.join(REPO_ROOT, 'src/fixtures/telemetry_collectors');
    const tsConfig = ts.findConfigFile('./', ts.sys.fileExists, 'tsconfig.json');
    if (!tsConfig) {
      throw new Error('Could not find a valid tsconfig.json.');
    }
    const configs = await parseTelemetryRC(configRoot);
    expect(configs).toHaveLength(1);
    const programPaths = await getProgramPaths(configs[0]);
    const results = [...extractCollectors(programPaths, tsConfig)];
    expect(results).toHaveLength(12);

    // loop over results for better error messages on failure:
    for (const result of results) {
      const [resultPath, resultCollectorDetails] = result;
      const matchingCollector = allExtractedCollectors.find(
        ([, extractorCollectorDetails]) =>
          extractorCollectorDetails.collectorName === resultCollectorDetails.collectorName
      );
      if (!matchingCollector) {
        throw new Error(`Unable to find matching collector in ${resultPath}`);
      }

      expect(result).toStrictEqual(matchingCollector);
    }
  });
});
