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

import { resolve, sep } from 'path';

import { File } from './file';

const HERE = resolve(__dirname, __filename);

describe('dev/File', () => {
  describe('constructor', () => {
    it('throws if path is not a string', () => {
      expect(() => new File()).toThrow();
      expect(() => new File(1)).toThrow();
      expect(() => new File(false)).toThrow();
      expect(() => new File(null)).toThrow();
    });
  });

  describe('#getRelativePath()', () => {
    it('returns the path relative to the repo root', () => {
      const file = new File(HERE);
      expect(file.getRelativePath()).toBe(['src', 'dev', 'file.test.js'].join(sep));
    });
  });

  describe('#isJs()', () => {
    it('returns true if extension is .js', () => {
      const file = new File('file.js');
      expect(file.isJs()).toBe(true);
    });
    it('returns false if extension is .xml', () => {
      const file = new File('file.xml');
      expect(file.isJs()).toBe(false);
    });
    it('returns false if extension is .css', () => {
      const file = new File('file.css');
      expect(file.isJs()).toBe(false);
    });
    it('returns false if extension is .html', () => {
      const file = new File('file.html');
      expect(file.isJs()).toBe(false);
    });
    it('returns false if file has no extension', () => {
      const file = new File('file');
      expect(file.isJs()).toBe(false);
    });
  });

  describe('#getRelativeParentDirs()', () => {
    it('returns the parents of a file, stopping at the repo root, in descending order', () => {
      const file = new File(HERE);
      expect(file.getRelativeParentDirs()).toStrictEqual([['src', 'dev'].join(sep), 'src']);
    });
  });

  describe('#toString()', () => {
    it('returns the relativePath', () => {
      const file = new File(HERE);
      expect(file.toString()).toBe(file.getRelativePath());
    });
  });

  describe('#toJSON()', () => {
    it('returns the relativePath', () => {
      const file = new File(HERE);
      expect(file.toJSON()).toBe(file.getRelativePath());
    });
  });
});
