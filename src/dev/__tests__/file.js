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

import expect from 'expect.js';

import { File } from '../file';

const HERE = resolve(__dirname, __filename);

describe('dev/File', () => {
  describe('constructor', () => {
    it('throws if path is not a string', () => {
      expect(() => new File()).to.throwError();
      expect(() => new File(1)).to.throwError();
      expect(() => new File(false)).to.throwError();
      expect(() => new File(null)).to.throwError();
    });
  });

  describe('#getRelativePath()', () => {
    it('returns the path relative to the repo root', () => {
      const file = new File(HERE);
      expect(file.getRelativePath()).to.eql(['src', 'dev', '__tests__', 'file.js'].join(sep));
    });
  });

  describe('#isJs()', () => {
    it('returns true if extension is .js', () => {
      const file = new File('file.js');
      expect(file.isJs()).to.eql(true);
    });
    it('returns false if extension is .xml', () => {
      const file = new File('file.xml');
      expect(file.isJs()).to.eql(false);
    });
    it('returns false if extension is .css', () => {
      const file = new File('file.css');
      expect(file.isJs()).to.eql(false);
    });
    it('returns false if extension is .html', () => {
      const file = new File('file.html');
      expect(file.isJs()).to.eql(false);
    });
    it('returns false if file has no extension', () => {
      const file = new File('file');
      expect(file.isJs()).to.eql(false);
    });
  });

  describe('#getRelativeParentDirs()', () => {
    it('returns the parents of a file, stopping at the repo root, in descending order', () => {
      const file = new File(HERE);
      expect(file.getRelativeParentDirs()).to.eql([
        ['src', 'dev', '__tests__'].join(sep), // src/dev/__tests__
        ['src', 'dev'].join(sep), // src/dev
        'src',
      ]);
    });
  });

  describe('#toString()', () => {
    it('returns the relativePath', () => {
      const file = new File(HERE);
      expect(file.toString()).to.eql(file.getRelativePath());
    });
  });

  describe('#toJSON()', () => {
    it('returns the relativePath', () => {
      const file = new File(HERE);
      expect(file.toJSON()).to.eql(file.getRelativePath());
    });
  });
});
