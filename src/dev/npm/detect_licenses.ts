/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { basename, extname, join } from 'path';
import { lstatSync, readdirSync, readFileSync } from 'fs';
import parseSpdxExpression from 'spdx-expression-parse';
import type normalizePackageData from 'normalize-package-data';

// Detection rules follow license-checker (BSD-3-Clause) so results keep matching the
// `*`-suffixed guesses (e.g. `MIT*`) allowed in src/dev/license_checker/config.ts.

const UNKNOWN = 'UNKNOWN';

type Licenses = string | Array<string | undefined> | null;

const LICENSE_FILE_PRECEDENCE = [
  /^LICENSE$/,
  /^LICENSE\-\w+$/,
  /^LICENCE$/,
  /^LICENCE\-\w+$/,
  /^COPYING$/,
  /^README$/,
];

const LICENSE_TEXT_PATTERNS: Array<[RegExp, string]> = [
  [/The ISC License/, 'ISC*'],
  [/ermission is hereby granted, free of charge, to any/, 'MIT*'],
  [/edistribution and use in source and binary forms, with or withou/, 'BSD*'],
  [
    /edistribution and use of this software in source and binary forms, with or withou/,
    'BSD-Source-Code*',
  ],
  [/DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE/, 'WTFPL*'],
  [/\bISC\b/, 'ISC*'],
  [/\bMIT\b/, 'MIT*'],
  [/\bBSD\b/, 'BSD*'],
  [/\bWTFPL\b/, 'WTFPL*'],
  [/\bApache License\b/, 'Apache*'],
  [
    /The\s+person\s+who\s+associated\s+a\s+work\s+with\s+this\s+deed\s+has\s+dedicated\s+the\s+work\s+to\s+the\s+public\s+domain\s+by\s+waiving\s+all\s+of\s+his\s+or\s+her\s+rights\s+to\s+the\s+work\s+worldwide\s+under\s+copyright\s+law,\s+including\s+all\s+related\s+and\s+neighboring\s+rights,\s+to\s+the\s+extent\s+allowed\s+by\s+law.\s+You\s+can\s+copy,\s+modify,\s+distribute\s+and\s+perform\s+the\s+work,\s+even\s+for\s+commercial\s+purposes,\s+all\s+without\s+asking\s+permission./i,
    'CC0-1.0*',
  ],
];

const GPL = /\bGNU GENERAL PUBLIC LICENSE\s*Version ([^,]*)/i;
const LGPL = /(?:LESSER|LIBRARY) GENERAL PUBLIC LICENSE\s*Version ([^,]*)/i;
const PUBLIC_DOMAIN = /[Pp]ublic [Dd]omain/;
const IS_URL = /(https?:\/\/[-a-zA-Z0-9\/.]*)/;
const IS_FILE_REFERENCE = /SEE LICENSE IN (.*)/i;

/**
 * Licenses declared in package.json (or guessed from the README), falling back to
 * the text of LICENSE-like files when that yields nothing usable.
 */
export function detectLicenses(directory: string, json: normalizePackageData.Package): string[] {
  let licenses = fromPackageJson(json);

  for (const file of findLicenseFiles(directory)) {
    if (isUnresolved(licenses)) {
      licenses = detectLicense(readFileSync(file, 'utf8'));
    }
  }

  return ([] as Array<string | undefined>)
    .concat(licenses || UNKNOWN)
    .map((license) => license ?? UNKNOWN);
}

function fromPackageJson(json: normalizePackageData.Package): Licenses {
  const declared = json.license || json.licenses;

  if (!declared) {
    return detectLicense(json.readme) || UNKNOWN;
  } else if (Array.isArray(declared) && declared.length > 0) {
    const licenses = declared.map((license) =>
      typeof license === 'object' ? license.type || license.name : license
    );
    return licenses.length === 1 ? licenses[0] : licenses;
  } else if (typeof declared === 'object' && (declared.type || declared.name)) {
    return detectLicense(declared.type || declared.name);
  } else if (typeof declared === 'string') {
    return detectLicense(declared);
  } else {
    return UNKNOWN;
  }
}

function isUnresolved(licenses: Licenses) {
  if (!licenses) {
    return true;
  } else if (typeof licenses === 'string') {
    return licenses.includes(UNKNOWN) || licenses.startsWith('Custom:');
  } else {
    return licenses.includes(UNKNOWN) || licenses[0] === 'Custom:';
  }
}

function findLicenseFiles(directory: string): string[] {
  let files: string[];
  try {
    files = readdirSync(directory);
  } catch {
    return [];
  }

  return LICENSE_FILE_PRECEDENCE.flatMap((pattern) => {
    const match = files.find((file) => pattern.test(basename(file, extname(file)).toUpperCase()));
    return match ? [join(directory, match)] : [];
  }).filter((file) => lstatSync(file).isFile());
}

function detectLicense(text: string | undefined): string | null {
  if (!text) {
    return 'Undefined';
  } else if (isSpdxExpression(text)) {
    return text;
  }

  const str = text.replace('\n', '');
  const textMatch = LICENSE_TEXT_PATTERNS.find(([pattern]) => pattern.test(str));
  const gpl = GPL.exec(str);
  const lgpl = LGPL.exec(str);
  const reference = IS_URL.exec(str) || IS_FILE_REFERENCE.exec(str);

  if (textMatch) {
    return textMatch[1];
  } else if (gpl) {
    return `GPL-${withMinorVersion(gpl[1])}*`;
  } else if (lgpl) {
    return `LGPL-${withMinorVersion(lgpl[1])}*`;
  } else if (PUBLIC_DOMAIN.test(str)) {
    return 'Public Domain';
  } else if (reference) {
    return `Custom: ${reference[1]}`;
  } else {
    return null;
  }
}

function isSpdxExpression(text: string) {
  try {
    parseSpdxExpression(text);
    return true;
  } catch {
    return false;
  }
}

function withMinorVersion(version: string) {
  return version.length === 1 ? `${version}.0` : version;
}
