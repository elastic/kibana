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

// `@babel/preset-env` looks for and rewrites the following import
// statement into a list of import statements based on the polyfills
// necessary for our target environment (the current version of node)
// but since it does that during compilation, `import 'core-js/stable'`
// must be in a file that is loaded with `require()` AFTER `@babel/register`
// is configured.
//
// This is why we have this single statement in it's own file and require
// it from ./index.js
require('core-js/stable');
