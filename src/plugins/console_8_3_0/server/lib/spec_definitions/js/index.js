"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.jsSpecLoaders = void 0;

var _aggregations = require("./aggregations");

var _aliases = require("./aliases");

var _document = require("./document");

var _filter = require("./filter");

var _globals = require("./globals");

var _ingest = require("./ingest");

var _mappings = require("./mappings");

var _settings = require("./settings");

var _query = require("./query");

var _reindex = require("./reindex");

var _search = require("./search");

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
const jsSpecLoaders = [_aggregations.aggs, _aliases.aliases, _document.document, _filter.filter, _globals.globals, _ingest.ingest, _mappings.mappings, _settings.settings, _query.query, _reindex.reindex, _search.search];
exports.jsSpecLoaders = jsSpecLoaders;