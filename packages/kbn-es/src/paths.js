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

const os = require('os');
const path = require('path');

function useBat(bin) {
  return os.platform().startsWith('win') ? `${bin}.bat` : bin;
}

const tempDir = os.tmpdir();

exports.BASE_PATH = path.resolve(tempDir, 'kbn-es');

exports.GRADLE_BIN = useBat('./gradlew');
exports.ES_BIN = useBat('bin/elasticsearch');
exports.ES_CONFIG = 'config/elasticsearch.yml';

exports.ES_KEYSTORE_BIN = useBat('./bin/elasticsearch-keystore');

exports.ES_ARCHIVE_PATTERN =
  'distribution/archives/tar/build/distributions/elasticsearch-*-SNAPSHOT.tar.gz';
exports.ES_OSS_ARCHIVE_PATTERN =
  'distribution/archives/oss-tar/build/distributions/elasticsearch-*-SNAPSHOT.tar.gz';
