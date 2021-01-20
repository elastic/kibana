/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

const { decompress } = require('./decompress');
const fs = require('fs');
const path = require('path');
const del = require('del');
const os = require('os');

const fixturesFolder = path.resolve(__dirname, '__fixtures__');
const randomDir = Math.random().toString(36);
const tmpFolder = path.resolve(os.tmpdir(), randomDir);
const dataFolder = path.resolve(tmpFolder, 'data');
const esFolder = path.resolve(tmpFolder, '.es');

const zipSnapshot = path.resolve(dataFolder, 'snapshot.zip');
const tarGzSnapshot = path.resolve(dataFolder, 'snapshot.tar.gz');

beforeEach(() => {
  fs.mkdirSync(tmpFolder, { recursive: true });
  fs.mkdirSync(dataFolder, { recursive: true });
  fs.mkdirSync(esFolder, { recursive: true });

  fs.copyFileSync(path.resolve(fixturesFolder, 'snapshot.zip'), zipSnapshot);
  fs.copyFileSync(path.resolve(fixturesFolder, 'snapshot.tar.gz'), tarGzSnapshot);
});

afterEach(() => {
  del.sync(tmpFolder, { force: true });
});

test('zip strips root directory', async () => {
  await decompress(zipSnapshot, path.resolve(esFolder, 'foo'));
  expect(fs.readdirSync(path.resolve(esFolder, 'foo/bin'))).toContain('elasticsearch.bat');
});

test('tar strips root directory', async () => {
  await decompress(tarGzSnapshot, path.resolve(esFolder, 'foo'));
  expect(fs.readdirSync(path.resolve(esFolder, 'foo/bin'))).toContain('elasticsearch');
});
