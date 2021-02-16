/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// The following list applies to packages both
// used as dependencies or dev dependencies
export const LICENSE_WHITELIST = [
  'Elastic-License',
  'SSPL-1.0 OR Elastic License 2.0',
  '0BSD',
  '(BSD-2-Clause OR MIT OR Apache-2.0)',
  '(BSD-2-Clause OR MIT)',
  '(BSD-3-Clause AND Apache-2.0)',
  '(GPL-2.0 OR MIT)',
  '(MIT AND CC-BY-3.0)',
  '(MIT AND Zlib)',
  '(MIT OR Apache-2.0)',
  '(MIT OR GPL-3.0)',
  '(WTFPL OR MIT)',
  '(Unlicense OR Apache-2.0)',
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
  '(MIT AND BSD-3-Clause)',
  'BSD-3-Clause OR MIT',
  'BSD-3-Clause',
  '(BSD-3-Clause OR GPL-2.0)',
  'BSD-like',
  'CC0-1.0',
  'CC-BY',
  'CC-BY-3.0',
  'CC-BY-4.0',
  'Eclipse Distribution License - v 1.0',
  'FreeBSD',
  'ISC',
  'ISC*',
  'MIT OR GPL-2.0',
  '(MIT OR CC0-1.0)',
  'MIT',
  'MIT*',
  'MIT/X11',
  'new BSD, and MIT',
  '(OFL-1.1 AND MIT)',
  'PSF',
  'Public Domain',
  'Unlicense',
  'WTFPL OR ISC',
  'WTFPL',
  'Nuclide software',
];

// The following list only applies to licenses that
// we wanna allow in packages only used as dev dependencies
export const DEV_ONLY_LICENSE_WHITELIST = ['MPL-2.0'];

// Globally overrides a license for a given package@version
export const LICENSE_OVERRIDES = {
  'jsts@1.6.2': ['Eclipse Distribution License - v 1.0'], // cf. https://github.com/bjornharrtell/jsts
  '@mapbox/jsonlint-lines-primitives@2.0.2': ['MIT'], // license in readme https://github.com/tmcw/jsonlint

  // TODO can be removed if the https://github.com/jindw/xmldom/issues/239 is released
  'xmldom@0.1.27': ['MIT'],

  // TODO can be removed once we upgrade the use of walk dependency past or equal to v2.3.14
  'walk@2.3.9': ['MIT'],
};
