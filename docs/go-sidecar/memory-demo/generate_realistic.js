#!/usr/bin/env node

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const fs = require('fs');
const path = require('path');

const NUM_PLUGINS = 400;
const ROUTES_PER_PLUGIN = 3;
const SO_TYPES_PER_PLUGIN = 1;
const FIELDS_PER_SO_TYPE = 15;
const MIGRATIONS_PER_SO_TYPE = 4;
const CONFIG_FIELDS_PER_PLUGIN = 10;

const BASE_DIR = __dirname;
const NODE_DIR = path.join(BASE_DIR, 'node-realistic');
const GO_DIR = path.join(BASE_DIR, 'go-realistic');
const GO_MODULE = 'realistic-demo';

function pad(n, width) {
  return String(n).padStart(width, '0');
}

function generateNodePlugin(pluginIndex) {
  const pid = pad(pluginIndex, 4);
  const lines = [];

  lines.push(`const plugin_${pid} = {};`);
  lines.push('');

  // Config schema — nested object tree with defaults and validation
  lines.push(`plugin_${pid}.configSchema = {`);
  lines.push(`  id: 'plugin_${pid}',`);
  lines.push('  schema: {');
  for (let c = 0; c < CONFIG_FIELDS_PER_PLUGIN; c++) {
    if (c < 3) {
      lines.push(`    field_${c}: { type: 'string', defaultValue: 'default_${pid}_${c}', validate: (v) => typeof v === 'string' },`);
    } else if (c < 6) {
      lines.push(`    field_${c}: { type: 'boolean', defaultValue: ${c % 2 === 0}, validate: (v) => typeof v === 'boolean' },`);
    } else if (c < 8) {
      lines.push(`    field_${c}: { type: 'number', defaultValue: ${c * 100 + pluginIndex}, min: 0, max: 100000, validate: (v) => typeof v === 'number' },`);
    } else {
      lines.push(`    field_${c}: { type: 'duration', defaultValue: '${c * 10}s', validate: (v) => typeof v === 'string' },`);
    }
  }
  lines.push('  },');
  lines.push('};');
  lines.push('');

  // Routes — each with path, method, validation schema, security options, handler
  for (let r = 0; r < ROUTES_PER_PLUGIN; r++) {
    const methods = ['get', 'post', 'put'];
    const method = methods[r % methods.length];
    lines.push(`plugin_${pid}.route_${r} = {`);
    lines.push(`  method: '${method}',`);
    lines.push(`  path: '/api/plugin_${pid}/action_${r}',`);
    lines.push('  security: {');
    lines.push('    authz: {');
    lines.push(`      requiredPrivileges: ['plugin_${pid}_action_${r}'],`);
    lines.push('    },');
    lines.push('  },');
    lines.push("  options: { access: 'internal', tags: ['access:plugin_" + pid + "'] },");
    lines.push('  validate: {');
    if (method === 'get') {
      lines.push('    query: {');
      lines.push(`      page: { type: 'number', defaultValue: 1, min: 1 },`);
      lines.push(`      perPage: { type: 'number', defaultValue: 20, min: 1, max: 10000 },`);
      lines.push(`      sortField: { type: 'string', defaultValue: 'created_at' },`);
      lines.push(`      sortOrder: { type: 'string', defaultValue: 'desc' },`);
      lines.push(`      filter: { type: 'string', defaultValue: '' },`);
      lines.push('    },');
    } else {
      lines.push('    body: {');
      lines.push(`      name: { type: 'string', maxLength: 256 },`);
      lines.push(`      description: { type: 'string', maxLength: 2048 },`);
      lines.push(`      enabled: { type: 'boolean', defaultValue: true },`);
      lines.push(`      params: { type: 'object', properties: { key: { type: 'string' }, value: { type: 'string' } } },`);
      lines.push(`      tags: { type: 'array', items: { type: 'string', maxLength: 64 }, maxItems: 20 },`);
      lines.push('    },');
    }
    lines.push('  },');
    lines.push(`  handler: function(ctx, req, res) {`);
    lines.push(`    const data = { plugin: 'plugin_${pid}', action: 'action_${r}', ts: Date.now() };`);
    lines.push('    return res.ok({ body: data });');
    lines.push('  },');
    lines.push('};');
    lines.push('');
  }

  // Saved object type — mappings, migrations, management
  lines.push(`plugin_${pid}.soType = {`);
  lines.push(`  name: 'plugin-${pid}-object',`);
  lines.push(`  indexPattern: '.kibana_plugin_${pid}',`);
  lines.push('  hidden: false,');
  lines.push("  namespaceType: 'multiple-isolated',");
  lines.push('  mappings: {');
  lines.push('    dynamic: false,');
  lines.push('    properties: {');
  for (let f = 0; f < FIELDS_PER_SO_TYPE; f++) {
    if (f < 5) {
      lines.push(`      field_${f}: { type: 'keyword' },`);
    } else if (f < 10) {
      lines.push(`      field_${f}: { type: 'text', analyzer: 'standard', fields: { raw: { type: 'keyword' } } },`);
    } else if (f < 13) {
      lines.push(`      field_${f}: { type: 'long' },`);
    } else {
      lines.push(`      field_${f}: { type: 'date', format: 'epoch_millis' },`);
    }
  }
  lines.push('    },');
  lines.push('  },');

  // Migrations
  lines.push('  migrations: {');
  for (let m = 0; m < MIGRATIONS_PER_SO_TYPE; m++) {
    const ver = `7.${14 + m}.0`;
    lines.push(`    '${ver}': function(doc) {`);
    lines.push(`      doc.attributes.field_${m} = doc.attributes.field_${m} || 'migrated_${ver}';`);
    lines.push('      return doc;');
    lines.push('    },');
  }
  lines.push('  },');

  // Management
  lines.push('  management: {');
  lines.push(`    defaultSearchField: 'field_0',`);
  lines.push(`    importableAndExportable: true,`);
  lines.push(`    getTitle: (obj) => obj.attributes.field_0 || 'Untitled',`);
  lines.push(`    getInAppUrl: (obj) => ({ path: '/app/plugin_${pid}/' + obj.id, uiCapabilitiesPath: 'plugin_${pid}.show' }),`);
  lines.push(`    getEditUrl: (obj) => '/management/plugin_${pid}/objects/' + obj.id,`);
  lines.push('  },');
  lines.push('};');
  lines.push('');

  // Plugin contract — setup/start returns with closures over internal state
  lines.push(`plugin_${pid}.contract = {`);
  lines.push(`  _internalRegistry: new Map(),`);
  lines.push(`  _listeners: new Set(),`);
  lines.push(`  _cache: [],`);
  lines.push('  register: function(id, definition) {');
  lines.push('    this._internalRegistry.set(id, definition);');
  lines.push('  },');
  lines.push('  get: function(id) {');
  lines.push('    return this._internalRegistry.get(id);');
  lines.push('  },');
  lines.push('  subscribe: function(fn) {');
  lines.push('    this._listeners.add(fn);');
  lines.push('    return () => this._listeners.delete(fn);');
  lines.push('  },');
  lines.push('};');
  lines.push('');

  lines.push(`module.exports = plugin_${pid};`);
  lines.push('');

  return lines.join('\n');
}

function generateNodeProject() {
  console.log('Generating Node.js realistic project...');
  const genDir = path.join(NODE_DIR, 'plugins');
  fs.mkdirSync(genDir, { recursive: true });

  const requires = [];
  const registrations = [];

  for (let p = 0; p < NUM_PLUGINS; p++) {
    const pid = pad(p, 4);
    const content = generateNodePlugin(p);
    fs.writeFileSync(path.join(genDir, `plugin_${pid}.js`), content);

    requires.push(`const plugin_${pid} = require('./plugins/plugin_${pid}');`);
    registrations.push(`  routeRegistry.set(plugin_${pid}.route_0.path, plugin_${pid}.route_0);`);
    registrations.push(`  routeRegistry.set(plugin_${pid}.route_1.path, plugin_${pid}.route_1);`);
    registrations.push(`  routeRegistry.set(plugin_${pid}.route_2.path, plugin_${pid}.route_2);`);
    registrations.push(`  soTypeRegistry.set(plugin_${pid}.soType.name, plugin_${pid}.soType);`);
    registrations.push(`  configRegistry.set(plugin_${pid}.configSchema.id, plugin_${pid}.configSchema);`);
    registrations.push(`  pluginContracts.set('plugin_${pid}', plugin_${pid}.contract);`);

    if ((p + 1) % 50 === 0) {
      process.stdout.write(`  ${p + 1}/${NUM_PLUGINS} plugins\r`);
    }
  }
  console.log(`  ${NUM_PLUGINS}/${NUM_PLUGINS} plugins`);

  const serverLines = [
    "const http = require('http');",
    '',
    ...requires,
    '',
    'const routeRegistry = new Map();',
    'const soTypeRegistry = new Map();',
    'const configRegistry = new Map();',
    'const pluginContracts = new Map();',
    '',
    ...registrations,
    '',
    'const server = http.createServer((req, res) => {',
    "  if (req.url === '/health') {",
    '    const body = JSON.stringify({',
    "      status: 'ok',",
    '      routes: routeRegistry.size,',
    '      soTypes: soTypeRegistry.size,',
    '      configs: configRegistry.size,',
    '      plugins: pluginContracts.size,',
    '    });',
    "    res.writeHead(200, { 'Content-Type': 'application/json' });",
    '    res.end(body);',
    '  } else {',
    '    res.writeHead(404);',
    "    res.end('not found');",
    '  }',
    '});',
    '',
    'server.listen(3003, () => {',
    "  console.log('Node.js realistic server ready on :3003');",
    '});',
    '',
  ];
  fs.writeFileSync(path.join(NODE_DIR, 'server.js'), serverLines.join('\n'));

  const totalRoutes = NUM_PLUGINS * ROUTES_PER_PLUGIN;
  const totalSoTypes = NUM_PLUGINS * SO_TYPES_PER_PLUGIN;
  console.log(`  ${totalRoutes} routes, ${totalSoTypes} SO types, ${NUM_PLUGINS} configs`);
}

function generateGoPlugin(pluginIndex) {
  const pid = pad(pluginIndex, 4);
  const lines = [];

  lines.push(`package plugin${pid}`);
  lines.push('');

  // Config schema struct
  lines.push('type ConfigField struct {');
  lines.push('\tFieldType    string');
  lines.push('\tDefaultValue string');
  lines.push('\tMin          int');
  lines.push('\tMax          int');
  lines.push('}');
  lines.push('');
  lines.push('type ConfigSchema struct {');
  lines.push('\tID     string');
  lines.push('\tFields map[string]ConfigField');
  lines.push('}');
  lines.push('');

  // Route structs
  lines.push('type ValidationField struct {');
  lines.push('\tFieldType    string');
  lines.push('\tDefaultValue string');
  lines.push('\tMaxLength    int');
  lines.push('\tMin          int');
  lines.push('\tMax          int');
  lines.push('}');
  lines.push('');
  lines.push('type SecurityConfig struct {');
  lines.push('\tRequiredPrivileges []string');
  lines.push('}');
  lines.push('');
  lines.push('type RouteDefinition struct {');
  lines.push('\tMethod   string');
  lines.push('\tPath     string');
  lines.push('\tSecurity SecurityConfig');
  lines.push('\tAccess   string');
  lines.push('\tTags     []string');
  lines.push('\tValidate map[string]ValidationField');
  lines.push('}');
  lines.push('');

  // SO type structs
  lines.push('type MappingField struct {');
  lines.push('\tFieldType string');
  lines.push('\tAnalyzer  string');
  lines.push('\tFormat    string');
  lines.push('}');
  lines.push('');
  lines.push('type SOTypeDefinition struct {');
  lines.push('\tName          string');
  lines.push('\tIndexPattern  string');
  lines.push('\tHidden        bool');
  lines.push('\tNamespaceType string');
  lines.push('\tMappings      map[string]MappingField');
  lines.push('\tMigrations    []string');
  lines.push('\tSearchField   string');
  lines.push('\tExportable    bool');
  lines.push('}');
  lines.push('');

  // Plugin contract struct
  lines.push('type PluginContract struct {');
  lines.push('\tID       string');
  lines.push('\tRegistry map[string]interface{}');
  lines.push('}');
  lines.push('');

  // Build config
  lines.push('func BuildConfig() ConfigSchema {');
  lines.push('\tfields := map[string]ConfigField{');
  for (let c = 0; c < CONFIG_FIELDS_PER_PLUGIN; c++) {
    if (c < 3) {
      lines.push(`\t\t"field_${c}": {FieldType: "string", DefaultValue: "default_${pid}_${c}"},`);
    } else if (c < 6) {
      lines.push(`\t\t"field_${c}": {FieldType: "boolean", DefaultValue: "${c % 2 === 0}"},`);
    } else if (c < 8) {
      lines.push(`\t\t"field_${c}": {FieldType: "number", DefaultValue: "${c * 100 + pluginIndex}", Min: 0, Max: 100000},`);
    } else {
      lines.push(`\t\t"field_${c}": {FieldType: "duration", DefaultValue: "${c * 10}s"},`);
    }
  }
  lines.push('\t}');
  lines.push(`\treturn ConfigSchema{ID: "plugin_${pid}", Fields: fields}`);
  lines.push('}');
  lines.push('');

  // Build routes
  lines.push('func BuildRoutes() []RouteDefinition {');
  lines.push('\treturn []RouteDefinition{');
  const methods = ['GET', 'POST', 'PUT'];
  for (let r = 0; r < ROUTES_PER_PLUGIN; r++) {
    const method = methods[r % methods.length];
    lines.push('\t\t{');
    lines.push(`\t\t\tMethod: "${method}",`);
    lines.push(`\t\t\tPath: "/api/plugin_${pid}/action_${r}",`);
    lines.push(`\t\t\tSecurity: SecurityConfig{RequiredPrivileges: []string{"plugin_${pid}_action_${r}"}},`);
    lines.push(`\t\t\tAccess: "internal",`);
    lines.push(`\t\t\tTags: []string{"access:plugin_${pid}"},`);
    if (method === 'GET') {
      lines.push('\t\t\tValidate: map[string]ValidationField{');
      lines.push('\t\t\t\t"page": {FieldType: "number", DefaultValue: "1", Min: 1},');
      lines.push('\t\t\t\t"perPage": {FieldType: "number", DefaultValue: "20", Min: 1, Max: 10000},');
      lines.push('\t\t\t\t"sortField": {FieldType: "string", DefaultValue: "created_at"},');
      lines.push('\t\t\t\t"sortOrder": {FieldType: "string", DefaultValue: "desc"},');
      lines.push('\t\t\t\t"filter": {FieldType: "string", DefaultValue: ""},');
      lines.push('\t\t\t},');
    } else {
      lines.push('\t\t\tValidate: map[string]ValidationField{');
      lines.push('\t\t\t\t"name": {FieldType: "string", MaxLength: 256},');
      lines.push('\t\t\t\t"description": {FieldType: "string", MaxLength: 2048},');
      lines.push('\t\t\t\t"enabled": {FieldType: "boolean", DefaultValue: "true"},');
      lines.push('\t\t\t\t"tags": {FieldType: "array", MaxLength: 64},');
      lines.push('\t\t\t},');
    }
    lines.push('\t\t},');
  }
  lines.push('\t}');
  lines.push('}');
  lines.push('');

  // Build SO type
  lines.push('func BuildSOType() SOTypeDefinition {');
  lines.push('\tmappings := map[string]MappingField{');
  for (let f = 0; f < FIELDS_PER_SO_TYPE; f++) {
    if (f < 5) {
      lines.push(`\t\t"field_${f}": {FieldType: "keyword"},`);
    } else if (f < 10) {
      lines.push(`\t\t"field_${f}": {FieldType: "text", Analyzer: "standard"},`);
    } else if (f < 13) {
      lines.push(`\t\t"field_${f}": {FieldType: "long"},`);
    } else {
      lines.push(`\t\t"field_${f}": {FieldType: "date", Format: "epoch_millis"},`);
    }
  }
  lines.push('\t}');
  lines.push('\tmigrations := []string{');
  for (let m = 0; m < MIGRATIONS_PER_SO_TYPE; m++) {
    lines.push(`\t\t"7.${14 + m}.0",`);
  }
  lines.push('\t}');
  lines.push('\treturn SOTypeDefinition{');
  lines.push(`\t\tName: "plugin-${pid}-object",`);
  lines.push(`\t\tIndexPattern: ".kibana_plugin_${pid}",`);
  lines.push('\t\tHidden: false,');
  lines.push('\t\tNamespaceType: "multiple-isolated",');
  lines.push('\t\tMappings: mappings,');
  lines.push('\t\tMigrations: migrations,');
  lines.push('\t\tSearchField: "field_0",');
  lines.push('\t\tExportable: true,');
  lines.push('\t}');
  lines.push('}');
  lines.push('');

  // Build contract
  lines.push('func BuildContract() PluginContract {');
  lines.push('\treturn PluginContract{');
  lines.push(`\t\tID: "plugin_${pid}",`);
  lines.push('\t\tRegistry: make(map[string]interface{}),');
  lines.push('\t}');
  lines.push('}');
  lines.push('');

  return lines.join('\n');
}

function generateGoProject() {
  console.log('Generating Go realistic project...');

  const imports = [];
  const initLines = [];

  for (let p = 0; p < NUM_PLUGINS; p++) {
    const pid = pad(p, 4);
    const pkgName = `plugin${pid}`;
    const pkgDir = path.join(GO_DIR, 'plugins', pkgName);
    fs.mkdirSync(pkgDir, { recursive: true });

    const content = generateGoPlugin(p);
    fs.writeFileSync(path.join(pkgDir, `${pkgName}.go`), content);

    imports.push(`\t"${GO_MODULE}/plugins/${pkgName}"`);

    initLines.push(`\tcfg${pid} := ${pkgName}.BuildConfig()`);
    initLines.push(`\tconfigRegistry[cfg${pid}.ID] = cfg${pid}`);
    initLines.push(`\tfor _, r := range ${pkgName}.BuildRoutes() {`);
    initLines.push(`\t\trouteRegistry[r.Path] = r`);
    initLines.push('\t}');
    initLines.push(`\tso${pid} := ${pkgName}.BuildSOType()`);
    initLines.push(`\tsoTypeRegistry[so${pid}.Name] = so${pid}`);
    initLines.push(`\tc${pid} := ${pkgName}.BuildContract()`);
    initLines.push(`\tpluginContracts[c${pid}.ID] = c${pid}`);
    initLines.push('');

    if ((p + 1) % 50 === 0) {
      process.stdout.write(`  ${p + 1}/${NUM_PLUGINS} plugins\r`);
    }
  }
  console.log(`  ${NUM_PLUGINS}/${NUM_PLUGINS} plugins`);

  const goMod = [`module ${GO_MODULE}`, '', 'go 1.21', ''].join('\n');
  fs.writeFileSync(path.join(GO_DIR, 'go.mod'), goMod);

  // We need a common types package that main.go can use for the registry map types
  // Actually, each plugin defines its own types, so main stores interface{}.
  // For simplicity, main uses map[string]interface{} for all registries.

  const mainLines = [
    'package main',
    '',
    'import (',
    '\t"fmt"',
    '\t"net/http"',
    '',
    ...imports,
    ')',
    '',
    'func main() {',
    '\trouteRegistry := make(map[string]interface{})',
    '\tsoTypeRegistry := make(map[string]interface{})',
    '\tconfigRegistry := make(map[string]interface{})',
    '\tpluginContracts := make(map[string]interface{})',
    '',
    ...initLines,
    '\thttp.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {',
    '\t\tw.Header().Set("Content-Type", "application/json")',
    '\t\tfmt.Fprintf(w, `{"status":"ok","routes":%d,"soTypes":%d,"configs":%d,"plugins":%d}`,',
    '\t\t\tlen(routeRegistry), len(soTypeRegistry), len(configRegistry), len(pluginContracts))',
    '\t})',
    '',
    '\tfmt.Println("Go realistic server ready on :3004")',
    '\thttp.ListenAndServe(":3004", nil)',
    '}',
    '',
  ];
  fs.writeFileSync(path.join(GO_DIR, 'main.go'), mainLines.join('\n'));

  const totalRoutes = NUM_PLUGINS * ROUTES_PER_PLUGIN;
  const totalSoTypes = NUM_PLUGINS * SO_TYPES_PER_PLUGIN;
  console.log(`  ${totalRoutes} routes, ${totalSoTypes} SO types, ${NUM_PLUGINS} configs`);
}

function clean() {
  console.log('Cleaning previous output...');
  fs.rmSync(NODE_DIR, { recursive: true, force: true });
  fs.rmSync(GO_DIR, { recursive: true, force: true });
}

const start = Date.now();
clean();
generateNodeProject();
generateGoProject();
const elapsed = ((Date.now() - start) / 1000).toFixed(1);
console.log(`\nDone in ${elapsed}s`);
