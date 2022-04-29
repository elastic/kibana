/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.jsSpecLoaders = void 0;

const _aggregations = require('./aggregations');

const _aliases = require('./aliases');

const _document = require('./document');

const _filter = require('./filter');

const _globals = require('./globals');

const _ingest = require('./ingest');

const _mappings = require('./mappings');

const _settings = require('./settings');

const _query = require('./query');

const _reindex = require('./reindex');

const _search = require('./search');

const jsSpecLoaders = [
  _aggregations.aggs,
  _aliases.aliases,
  _document.document,
  _filter.filter,
  _globals.globals,
  _ingest.ingest,
  _mappings.mappings,
  _settings.settings,
  _query.query,
  _reindex.reindex,
  _search.search,
];
exports.jsSpecLoaders = jsSpecLoaders;
