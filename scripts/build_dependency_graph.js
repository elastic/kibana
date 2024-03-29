/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
var Fs = require('fs');
var Path = require('path');
var JSON5 = require('json5');

var info = require('@kbn/repo-info');
var ES = require('@elastic/elasticsearch');
var EsClient = ES.Client;
var HttpConnection = ES.HttpConnection;

var SKIP_FOLDERS = ['bazel-kibana', 'node_modules', '.es'];

async function walk(dir, dictionary) {
  var files = Fs.readdirSync(dir);
  var jsoncFile = files.find(function (f) {
    return f === 'kibana.jsonc';
  });
  var tsConfigFile = files.find(function (f) {
    return f === 'tsconfig.json';
  });
  if (jsoncFile && tsConfigFile) {
    var jsoncString = Fs.readFileSync(Path.resolve(dir, jsoncFile), { encoding: 'utf-8' });
    var tsConfigString = Fs.readFileSync(Path.resolve(dir, tsConfigFile), { encoding: 'utf-8' });
    var jsonc = JSON5.parse(jsoncString);
    var tsConfig = JSON5.parse(tsConfigString);
    dictionary[jsonc.id] = {
      deps: tsConfig.kbn_references,
      pluginId: jsonc.plugin ? jsonc.plugin.id : undefined,
      path: dir,
    };
  }
  files.map(function (file) {
    var filePath = Path.join(dir, file);
    var stats = Fs.statSync(filePath);
    if (stats.isDirectory() && !jsoncFile && !SKIP_FOLDERS.includes(file)) {
      return walk(filePath, dictionary);
    }
  });

  return dictionary;
}

function prepareDocs(dictionary) {
  var docs = [];
  for (var record of Object.entries(dictionary)) {
    if (Array.isArray(record[1].deps)) {
      for (var dep of record[1].deps) {
        docs.push({
          package: record[0],
          dependency: dep,
          pluginId: record[1].pluginId,
          path: record[1].path,
        });
      }
    }
  }
  return docs;
}

var es = new EsClient({
  Connection: HttpConnection,
  tls: {
    ca: Fs.readFileSync(Path.resolve(info.REPO_ROOT, 'packages/kbn-dev-utils/certs/', 'ca.crt')),
  },
  requestTimeout: 30000,
  nodes: ['http://elastic:changeme@localhost:9200'],
});

function createIndex(indexName) {
  return es.indices.create({
    index: indexName,
    body: {
      mappings: {
        properties: {
          package: {
            type: 'keyword',
          },
          dependency: {
            type: 'keyword',
          },
        },
      },
    },
  });
}

function addDocs(indexName, docs) {
  es.bulk({
    index: indexName,
    body: docs.map(function (d) {
      return `{"index": {}}\n${JSON.stringify(d)}\n`;
    }),
  });
}

function registerDepsInES(dictionary) {
  var indexName = 'kibana_packages_dependencies';
  return createIndex(indexName)
    .then(
      function () {
        return addDocs(indexName, prepareDocs(dictionary));
      },
      function (err) {
        console.error('Error while creating the ES index');
        console.error(err.message);
      }
    )
    .catch(function (err) {
      console.error('Error while adding docs to ES');
      console.error(err.message);
      throw Error('');
    })
    .then(function () {
      console.log('All done');
    });
}

var dependenciesMap = {};
walk('.', dependenciesMap).then(function (dictionary) {
  console.log('Dependency map created');
  return registerDepsInES(dictionary);
});
