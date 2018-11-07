/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

const { decompress } = require('./decompress');
const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const del = require('del');
const os = require('os');

// NOTE: we just remove mock-fs from this tests and instead
// apply a real fs usage over a temp folder because mock-fs
// has a bug on node >= 10.5 with the streams that was not
// yet solved.
// https://github.com/tschaub/mock-fs/issues/238
const fixturesFolder = path.resolve(__dirname, '__fixtures__');
const tmpFolder = path.resolve(os.tmpdir(), 'kbn_es_decompress_fixtures');
const dataFolder = path.resolve(tmpFolder, 'data');
const esFolder = path.resolve(tmpFolder, '.es');

const zipSnapshot = path.resolve(dataFolder, 'snapshot.zip');
const tarGzSnapshot = path.resolve(dataFolder, 'snapshot.tar.gz');

beforeAll(() => {
  mkdirp.sync(tmpFolder);
  mkdirp.sync(dataFolder);
  mkdirp.sync(esFolder);

  fs.copyFileSync(path.resolve(fixturesFolder, 'snapshot.zip'), zipSnapshot);
  fs.copyFileSync(path.resolve(fixturesFolder, 'snapshot.tar.gz'), tarGzSnapshot);
});

afterAll(() => {
  del.sync(tmpFolder, { force: true });
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
