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

// We normalize all path separators to `/` in generated files
function normalizePath(path) {
  return path.replace(/[\\\/]+/g, '/');
}

export default function() {
  if (!module.id.includes('?')) {
    throw new Error('create_ui_exports_module loaded without JSON args in module.id');
  }

  const { type, modules } = JSON.parse(module.id.slice(module.id.indexOf('?') + 1));
  const comment = `// dynamically generated to load ${type} uiExports from plugins`;
  const requires = modules
    .sort((a, b) => a.localeCompare(b))
    .map(m => `require('${normalizePath(m)}')`)
    .join('\n        ');

  return {
    code: `${comment}\n${requires}\n`,
  };
}
