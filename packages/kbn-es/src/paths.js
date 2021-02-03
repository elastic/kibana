/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

const os = require('os');
const path = require('path');

function maybeUseBat(bin) {
  return os.platform().startsWith('win') ? `${bin}.bat` : bin;
}

const tempDir = os.tmpdir();

exports.BASE_PATH = path.resolve(tempDir, 'kbn-es');

exports.GRADLE_BIN = maybeUseBat('./gradlew');
exports.ES_BIN = maybeUseBat('bin/elasticsearch');
exports.ES_CONFIG = 'config/elasticsearch.yml';

exports.ES_KEYSTORE_BIN = maybeUseBat('./bin/elasticsearch-keystore');
