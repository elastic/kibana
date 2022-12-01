/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { parentPort, workerData } from 'worker_threads';
import process from 'process';
import { sample } from 'lodash';
// eslint-disable-next-line import/no-extraneous-dependencies
import { faker } from '@faker-js/faker';
import { createLogger, LogLevel } from './lib/util/create_logger';

const l = {
  perf: <T extends any>(name: string, cb: () => T): T => {
    return cb();
  },
  debug: (...args: any[]) => parentPort?.postMessage({ log: LogLevel.debug, args }),
  info: (...args: any[]) => parentPort?.postMessage({ log: LogLevel.info, args }),
  error: (...args: any[]) => parentPort?.postMessage({ log: LogLevel.error, args }),
};

const FIELD_TYPES = ['bool', 'str', 'int', 'ipv4', 'ts', 'text'];

export interface WorkerData {
  numberOfDocuments: number;
}

const { numberOfDocuments } = workerData as WorkerData;
const logger = createLogger(LogLevel.info);

function getRandomInt(min: number, max: number) {
  return faker.datatype.number({ min: Math.ceil(min), max: Math.floor(max) });
}

function generateCount(min: number, max: number) {
  if (Math.floor(min) === Math.floor(max)) {
    return max;
  }
  if (min > max) {
    return getRandomInt(max, min);
  }
  return getRandomInt(min, max);
}

function getDataForFormat(format: string): {
  key: string;
  value: 'string' | boolean | number | Date;
} {
  const parts = format.split(':');

  const fieldName = parts[0];
  const fieldType = parts[1];

  let retVal: any;
  switch (fieldType) {
    case 'bool':
      retVal = sample([true, false]);
      break;
    case 'str':
      if (fieldName === 'name') {
        retVal = faker.name.fullName();
      } else {
        const min = parts.length < 3 ? 3 : Number.parseInt(parts[2], 10);
        const max = parts.length < 4 ? min + 7 : Number.parseInt(parts[3], 10);
        const len = generateCount(min, max);
        retVal = faker.random.alphaNumeric(len);
      }
      break;
    case 'int':
      if (fieldName === 'age') {
        retVal = Number.parseInt(faker.random.numeric(2), 10);
      } else {
        const min = parts.length < 3 ? 0 : Number.parseInt(parts[2], 10);
        const max = parts.length < 4 ? min + 100000 : Number.parseInt(parts[3], 10);
        retVal = generateCount(min, max);
      }
      break;
    case 'ipv4':
      retVal = faker.internet.ipv4();
      break;
    case 'ts':
    case 'tstxt':
      if (fieldName === 'last_updated') {
        retVal = faker.date.past(2);
      } else {
        const past = new Date();
        past.setMonth(past.getMonth() - 1);
        const future = new Date();
        future.setMonth(future.getMonth() + 1);
        retVal = faker.date.between(past, future);
      }
      break;
    case 'words':
      const count = getRandomInt(1, 10);
      retVal = faker.random.words(count);
      break;
    case 'dict':
    // TODO
    case 'text':
      const min = parts.length < 4 ? 1 : Number.parseInt(parts[3], 10);
      const max = parts.length < 5 ? min + 1 : Number.parseInt(parts[4], 10);
      const lineCount = generateCount(min, max);
      retVal = faker.lorem.lines(lineCount);
      break;
  }
  return {
    key: fieldName,
    value: retVal,
  };
}

function generateRandomDoc(format: string[]) {
  const res = {} as Record<string, any>;

  format.forEach((f) => {
    const { key, value } = getDataForFormat(f);
    res[key] = value;
  });

  return res;
}

const generateFieldType = () => {
  const index = getRandomInt(0, FIELD_TYPES.length - 1);
  return FIELD_TYPES[index];
};

const generateFieldName = () => {
  return faker.word.noun();
};

export function generateTestData() {
  const nrOfFields = 70;
  // name, age and last_updated should be generated only once
  const format = 'name:str,age:int,last_updated:ts,ip:ipv4'.split(',');
  for (let i = 0; i <= nrOfFields; i++) {
    const fieldType = generateFieldType();
    const fieldName = generateFieldName();
    format.push(`${fieldName}:${fieldType}`);
  }
  const tsStart = new Date().toISOString();
  const items = [];
  for (let i = 1; i <= numberOfDocuments; i++) {
    const item = generateRandomDoc(format);
    items.push(item);
  }
  const tsEnd = new Date().toISOString();
  logger.info(`Started at: ${tsStart} and ended at: ${tsEnd}`);
  return items;
}

parentPort!.on('message', async (message) => {
  if (message === 'start') {
    try {
      const size = 5000;
      const items = generateTestData();
      let start = 0;
      const end = Math.round(numberOfDocuments / size);
      logger.info('End ' + end);
      // const remain = numberOfDocuments % size;
      for (let i = 0; i < end; i++) {
        const subItems = items.slice(start, start + size);
        start += size;
        logger.info('Sending message');

        logger.info('Hello');
        parentPort!.postMessage({ status: 'GENERATED_ITEMS', items: JSON.stringify(subItems) });

        logger.info('Sent message');
      }
      parentPort!.postMessage({ status: 'DONE' });
      process.exit(0);
    } catch (error) {
      parentPort!.postMessage({ status: 'ERROR' });
      l.info(error);
      process.exit(2);
    }
  }
});
