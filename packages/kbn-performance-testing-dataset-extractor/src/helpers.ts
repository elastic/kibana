/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { ToolingLog } from '@kbn/tooling-log';
import moment from 'moment';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

import { DATE_FORMAT } from './constants';
import { Doc, SpanDoc } from './es_client';

export const calculateEndTime = (startTime: string, duration: number): string => {
  return moment(startTime, DATE_FORMAT).add(duration, 'milliseconds').toISOString();
};

export const getSteps = (steps: Array<SearchHit<SpanDoc>>) => {
  return steps
    .map((doc) => doc!._source as SpanDoc)
    .map((doc: SpanDoc) => {
      return {
        name: doc.span.name,
        startTime: doc['@timestamp'],
        endTime: calculateEndTime(doc['@timestamp'], doc.span.duration.us / 1000),
      };
    });
};

export const calculateTransactionTimeRage = (hit: SearchHit<Doc>) => {
  const doc = hit._source as Doc;
  return {
    startTime: doc['@timestamp'],
    endTime: calculateEndTime(doc['@timestamp'], doc.transaction.duration.us / 1000),
  };
};

export const saveFile = async (
  output: any,
  outputDir: string,
  fileName: string,
  log: ToolingLog
) => {
  const filePath = path.resolve(outputDir, fileName);

  if (!existsSync(outputDir)) {
    await fs.mkdir(outputDir, { recursive: true });
  }
  await fs.writeFile(filePath, JSON.stringify(output, null, 2), 'utf8');
  log.info(`Output file saved: ${filePath}`);
};
