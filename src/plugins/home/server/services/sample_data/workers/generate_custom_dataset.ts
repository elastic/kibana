/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { parentPort, workerData } from 'worker_threads';
import process from 'process';
// eslint-disable-next-line import/no-extraneous-dependencies
import { faker } from '@faker-js/faker';
import { createLogger, LogLevel } from '../lib/util/create_logger';

export interface WorkerData {
  numberOfDocuments: number;
  fieldFormat: string;
}

const { fieldFormat } = workerData as WorkerData;
const logger = createLogger(LogLevel.info);

function getRandomInt(min: number, max: number) {
  return faker.datatype.number({ min: Math.ceil(min), max: Math.floor(max) });
}

function getDataForFormat(
  format: { name: string; type: string; distinctValues: number },
  fieldValues: Map<string, Set<string>>
): {
  key: string;
  value: string;
} {
  const { name, type, distinctValues } = format;

  // decide whether to generate a new value or pick existing
  const generate = fieldValues.has(name) ? faker.datatype.boolean() : true;
  if (!generate || (fieldValues.has(name) && fieldValues.get(name)!.size > distinctValues)) {
    // pick one of the existing values
    const setItems = Array.from(fieldValues.get(name)!);
    const index = getRandomInt(0, setItems.length - 1);
    return {
      key: name,
      value: setItems[index],
    };
  }
  let retVal: any;
  switch (type) {
    case 'country':
      retVal = faker.address.country();
      break;
    case 'county':
      retVal = faker.address.county();
      break;
    case 'city':
      retVal = faker.address.city();
      break;
    case 'state':
      retVal = faker.address.state();
      break;
    case 'color':
      retVal = faker.color.human();
      break;
    case 'company':
      retVal = faker.company.name();
      break;
    default:
      break;
  }
  if (!fieldValues.has(name)) {
    fieldValues.set(name, new Set<string>());
  }
  fieldValues.get(name)!.add(retVal);
  logger.info(fieldValues);
  return {
    key: name,
    value: retVal,
  };
}

function generateDoc(fieldValues: Map<string, Set<string>>) {
  const res = {} as Record<string, any>;
  const format = JSON.parse(fieldFormat);

  format.forEach((f: { name: string; type: string; distinctValues: number }) => {
    const { key, value } = getDataForFormat(f, fieldValues);
    res[key] = value;
  });

  return res;
}

export const generateTestData = (size: number, fieldValues: Map<string, Set<string>>) => {
  const tsStart = new Date().toISOString();
  const items = [];
  for (let i = 1; i <= size; i++) {
    const item = generateDoc(fieldValues);
    items.push(item);
  }
  const tsEnd = new Date().toISOString();
  logger.info(`Started at: ${tsStart} and ended at: ${tsEnd}`);
  return items;
};

parentPort!.on('message', async (message) => {
  if (message === 'start') {
    try {
      const size = 1000;
      const fieldValues = new Map<string, Set<string>>();
      for (let i = 0; i < 10000; i += size) {
        const items = generateTestData(size, fieldValues);
        parentPort!.postMessage({ status: 'GENERATED_ITEMS', items: JSON.stringify(items) });
        logger.info('Sent message');
      }
      parentPort!.postMessage({ status: 'DONE' });
      process.exit(0);
    } catch (error) {
      parentPort!.postMessage({ status: 'ERROR' });
      logger.info(error);
      process.exit(2);
    }
  } else if (message === 'stop') {
    logger.info('Stopping worker...');
    process.exit(0);
  }
});
