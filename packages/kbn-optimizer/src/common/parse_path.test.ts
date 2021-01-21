/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { parseFilePath, parseDirPath } from './parse_path';

const DIRS = ['/', '/foo/bar/baz/', 'c:\\', 'c:\\foo\\bar\\baz\\'];
const AMBIGUOUS = ['/foo', '/foo/bar/baz', 'c:\\foo', 'c:\\foo\\bar\\baz'];
const FILES = [
  '/foo/bar/baz.json',
  'c:/foo/bar/baz.json',
  'c:\\foo\\bar\\baz.json',
  '/foo/bar/baz.json?light',
  '/foo/bar/baz.json?light=true&dark=false',
  'c:\\foo\\bar\\baz.json?dark',
  'c:\\foo\\bar\\baz.json?dark=true&light=false',
];

describe('parseFilePath()', () => {
  it.each([...FILES, ...AMBIGUOUS])('parses %s', (path) => {
    expect(parseFilePath(path)).toMatchSnapshot();
  });
});

describe('parseDirPath()', () => {
  it.each([...DIRS, ...AMBIGUOUS])('parses %s', (path) => {
    expect(parseDirPath(path)).toMatchSnapshot();
  });
});
