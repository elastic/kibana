/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog } from '@kbn/tooling-log';
import fsp from 'fs/promises';
import fs from 'fs';
import path from 'path';

import { generateSimulationContent } from './build_simulation';
import { getHttpRequests } from './parse_traces';
import { Journey } from './types/journey';

export interface CLIParams {
  dir: string;
  baseUrl: string;
  packageName: string;
  log: ToolingLog;
}

export const generator = async ({ dir, baseUrl, packageName, log }: CLIParams) => {
  const jsonInDir = fs.readdirSync(dir).filter((file) => path.extname(file) === '.json');
  log.info(`Found ${jsonInDir.length} json files in path: ${jsonInDir}`);

  for (const file of jsonInDir) {
    const jsonPath = path.resolve(dir, file);
    const journey: Journey = JSON.parse(fs.readFileSync(jsonPath).toString());

    if (!journey.traceItems || journey.traceItems.length === 0) {
      log.error(`No 'traceItems' found in ${jsonPath}, skipping file`);
      return;
    }

    if (!journey.scalabilitySetup) {
      log.error(`No 'scalabilitySetup' found in ${jsonPath}, skipping file`);
      return;
    }

    const requests = getHttpRequests(journey.traceItems);
    requests.forEach((req) =>
      log.debug(`${req.date} ${req.transactionId} ${req.method} ${req.path}`)
    );

    const simulationName = journey.journeyName
      .replace(/[^a-zA-Z ]/g, ' ')
      .replace(/\b(\w)/g, (match, capture) => capture.toUpperCase())
      .replace(/\s+/g, '');

    const fileName = `${simulationName}.scala`;
    const outputDir = path.resolve('target/scalability_simulations');
    const filePath = path.resolve(outputDir, fileName);

    const fileContent = generateSimulationContent({
      simulationName,
      packageName,
      scenarioName: `${journey.journeyName} ${journey.kibanaVersion}`,
      baseUrl,
      scalabilitySetup: journey.scalabilitySetup,
      requests,
    });

    if (!fs.existsSync(outputDir)) {
      await fsp.mkdir(outputDir, { recursive: true });
    }

    const stream = fs.createWriteStream(filePath);
    stream.write(fileContent);
    stream.end(() => log.info(`Gatling simulation '${simulationName}' was saved in '${filePath}'`));
  }
};
