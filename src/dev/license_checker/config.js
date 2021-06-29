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

// The following list applies to packages both
// used as dependencies or dev dependencies
export const LICENSE_WHITELIST = [
  'Elastic-License',
  '(BSD-2-Clause OR MIT OR Apache-2.0)',
  '(BSD-2-Clause OR MIT)',
  '(GPL-2.0 OR MIT)',
  '(MIT AND CC-BY-3.0)',
  '(MIT AND Zlib)',
  '(MIT OR Apache-2.0)',
  '(WTFPL OR MIT)',
  'AFLv2.1',
  'Apache 2.0',
  'Apache License, v2.0',
  'Apache License, Version 2.0',
  'Apache',
  'Apache*',
  'Apache, Version 2.0',
  'Apache-2.0',
  'BSD 3-Clause',
  'BSD New',
  'BSD',
  'BSD*',
  'BSD-2-Clause',
  'BSD-3-Clause AND MIT',
  'BSD-3-Clause OR MIT',
  'BSD-3-Clause',
  '(BSD-3-Clause OR GPL-2.0)',
  'BSD-like',
  'CC0-1.0',
  'CC-BY',
  'CC-BY-3.0',
  'CC-BY-4.0',
  'Eclipse Distribution License - v 1.0',
  'ISC',
  'ISC*',
  'MIT OR GPL-2.0',
  'MIT',
  'MIT*',
  'MIT/X11',
  'new BSD, and MIT',
  'OFL-1.1 AND MIT',
  'Public Domain',
  'Unlicense',
  'WTFPL OR ISC',
  'WTFPL',
];

// The following list only applies to licenses that
// we wanna allow in packages only used as dev dependencies
export const DEV_ONLY_LICENSE_WHITELIST = [
  'MPL-2.0'
];

// Globally overrides a license for a given package@version
export const LICENSE_OVERRIDES = {
  'scriptjs@2.5.8': ['MIT'], // license header appended in the dist
  'react-lib-adler32@1.0.1': ['BSD'], // adler32 extracted from react source,
  'cycle@1.0.3': ['CC0-1.0'], // conversion to a public-domain like license
  'jsts@1.1.2': ['Eclipse Distribution License - v 1.0'], //cf. https://github.com/bjornharrtell/jsts
  '@mapbox/jsonlint-lines-primitives@2.0.2': ['MIT'], //license in readme https://github.com/tmcw/jsonlint

  // Override for the commercial hapi license
  '@commercial/accept@3.2.4': ['BSD-3-Clause'],
  '@commercial/ammo@3.1.2': ['BSD-3-Clause'],
  '@commercial/b64@4.2.1': ['BSD-3-Clause'],
  '@commercial/boom@7.4.12': ['BSD-3-Clause'],
  '@commercial/bounce@1.3.2': ['BSD-3-Clause'],
  '@commercial/bourne@1.3.2': ['BSD-3-Clause'],
  '@commercial/call@5.1.3': ['BSD-3-Clause'],
  '@commercial/catbox-memory@3.2.2': ['BSD-3-Clause'],
  '@commercial/catbox@10.2.3': ['BSD-3-Clause'],
  '@commercial/content@4.1.1': ['BSD-3-Clause'],
  '@commercial/cryptiles@4.2.1': ['BSD-3-Clause'],
  '@commercial/file@1.0.0': ['BSD-3-Clause'],
  '@commercial/formula@1.2.0': ['BSD-3-Clause'],
  '@commercial/hapi@17.9.4': ['BSD-3-Clause'],
  '@commercial/heavy@6.2.2': ['BSD-3-Clause'],
  '@commercial/hoek@6.2.5': ['BSD-3-Clause'],
  '@commercial/hoek@8.5.1': ['BSD-3-Clause'],
  '@commercial/iron@5.1.4': ['BSD-3-Clause'],
  '@commercial/joi@15.1.1': ['BSD-3-Clause'],
  '@commercial/joi@16.1.8': ['BSD-3-Clause'],
  '@commercial/mimos@4.1.1': ['BSD-3-Clause'],
  '@commercial/nigel@3.1.1': ['BSD-3-Clause'],
  '@commercial/pez@4.1.2': ['BSD-3-Clause'],
  '@commercial/pinpoint@1.0.2': ['BSD-3-Clause'],
  '@commercial/podium@3.4.3': ['BSD-3-Clause'],
  '@commercial/somever@2.1.1': ['BSD-3-Clause'],
  '@commercial/statehood@6.1.2': ['BSD-3-Clause'],
  '@commercial/subtext@6.1.3': ['BSD-3-Clause'],
  '@commercial/teamwork@3.3.1': ['BSD-3-Clause'],
  '@commercial/topo@3.1.6': ['BSD-3-Clause'],
  '@commercial/vise@3.1.1': ['BSD-3-Clause'],
  '@commercial/wreck@15.1.0': ['BSD-3-Clause'],

  // TODO can be removed once we upgrade past elasticsearch-browser@14.0.0
  'elasticsearch-browser@13.0.1': ['Apache-2.0'],

  // TODO can be removed once we upgrade past colors.js@1.0.0
  'colors@0.5.1': ['MIT'],

  // TODO can be removed once we upgrade past map-stream@0.5.0
  'map-stream@0.1.0': ['MIT'],

  'uglify-js@2.2.5': ['BSD'],
  'png-js@0.1.1': ['MIT'],
  'sha.js@2.4.11': ['BSD-3-Clause AND MIT'],

  // TODO can be removed if the ISSUE#239 is accepted on the source
  'xmldom@0.1.19': ['MIT'],

  // TODO can be removed if the PR#9 is accepted on the source
  'pause-stream@0.0.11': ['MIT'],

  // TODO can be removed once we upgrade past or equal pdf-image@2.0.1
  'pdf-image@1.1.0': ['MIT'],

  // TODO can be removed once we upgrade the use of walk dependency past or equal to v2.3.14
  'walk@2.3.9': ['MIT'],

  // TODO remove this once we upgrade past or equal to v1.0.2
  'babel-plugin-mock-imports@0.0.5': ['MIT']
};
