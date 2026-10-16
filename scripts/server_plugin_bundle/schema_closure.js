/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Experiment stand-in for agent_builder schema_closure.ts. Rspack aliases the
// real file to this one so shared schema JSON stays a runtime require instead
// of a package context in the plugin bundle.
/* global __non_webpack_require__ */

var memoize = require('lodash').memoize;
var isPlainObject = require('lodash').isPlainObject;

var jsonDirByTarget = {
  elasticsearch: 'es',
  kibana: 'kibana',
};

var sharedSchemaFilePattern = /^[\w.-]+\.json$/;

function isRecord(node) {
  return isPlainObject(node);
}

function collectSchemaRefs(node, found) {
  var key;
  var value;
  var file;
  var entries;
  var i;
  if (Array.isArray(node)) {
    for (i = 0; i < node.length; i++) {
      collectSchemaRefs(node[i], found);
    }
    return;
  }
  if (!isRecord(node)) {
    return;
  }
  entries = Object.entries(node);
  for (i = 0; i < entries.length; i++) {
    key = entries[i][0];
    value = entries[i][1];
    if (key === '$ref' && typeof value === 'string') {
      file = value.split('#')[0];
      if (file.length > 0) {
        found.add(file);
      }
    } else {
      collectSchemaRefs(value, found);
    }
  }
}

function loadSharedSchema(target, ref) {
  var file = ref.replace(/^\.\//, '');
  var imported;
  var schema;
  if (!sharedSchemaFilePattern.test(file)) {
    return Promise.reject(new Error('Unsupported schema reference "' + ref + '"'));
  }

  // Leave this require native so rspack does not build a package context.
  imported = __non_webpack_require__(
    '@elastic/schemas/' + jsonDirByTarget[target] + '/json/' + file
  );
  schema = imported;
  if (isRecord(imported) && isRecord(imported.default)) {
    schema = imported.default;
  }
  if (!isRecord(schema)) {
    return Promise.reject(
      new Error('Schema reference "' + ref + '" is not a JSON Schema document')
    );
  }
  return Promise.resolve(schema);
}

function buildSchemaClosure(target, schema) {
  var closure = new Map();
  var pending = new Set();
  collectSchemaRefs(schema, pending);

  function step() {
    var refs;
    if (pending.size === 0) {
      return Promise.resolve(closure);
    }
    refs = Array.from(pending);
    pending.clear();
    return Promise.all(
      refs.map(function (ref) {
        return loadSharedSchema(target, ref);
      })
    ).then(function (loaded) {
      loaded.forEach(function (sharedSchema, index) {
        var nested = new Set();
        closure.set(refs[index], sharedSchema);
        collectSchemaRefs(sharedSchema, nested);
        nested.forEach(function (ref) {
          if (!closure.has(ref)) {
            pending.add(ref);
          }
        });
      });
      return step();
    });
  }

  return step();
}

function getClosureLoader(target) {
  var load = memoize(function (schema) {
    return buildSchemaClosure(target, schema).catch(function (error) {
      load.cache.delete(schema);
      throw error;
    });
  });
  return load;
}

var closureLoaders = {
  elasticsearch: getClosureLoader('elasticsearch'),
  kibana: getClosureLoader('kibana'),
};

function loadSchemaClosure(target, schema) {
  return closureLoaders[target](schema);
}

module.exports = { loadSchemaClosure: loadSchemaClosure };
