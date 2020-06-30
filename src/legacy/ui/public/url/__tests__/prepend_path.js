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

import expect from '@kbn/expect';

import { prependPath } from '../prepend_path';

describe('url prependPath', function () {
  describe('returns the relative path unchanged', function () {
    it('if it is null', function () {
      expect(prependPath(null, 'kittens')).to.be(null);
    });

    it('if it is undefined', function () {
      expect(prependPath(undefined, 'kittens')).to.be(undefined);
    });

    it('if it is an absolute url', function () {
      expect(prependPath('http://www.hithere.com/howareyou', 'welcome')).to.be(
        'http://www.hithere.com/howareyou'
      );
    });

    it('if it does not start with a /', function () {
      expect(prependPath('are/so/cool', 'cats')).to.be('are/so/cool');
    });

    it('when new path is empty', function () {
      expect(prependPath('/are/so/cool', '')).to.be('/are/so/cool');
    });

    it('when it is only a slash and new path is empty', function () {
      expect(prependPath('/', '')).to.be('/');
    });
  });

  describe('returns an updated relative path', function () {
    it('when it starts with a slash', function () {
      expect(prependPath('/are/so/cool', 'dinosaurs')).to.be('dinosaurs/are/so/cool');
    });

    it('when new path starts with a slash', function () {
      expect(prependPath('/are/so/cool', '/fish')).to.be('/fish/are/so/cool');
    });

    it('with two slashes if new path is a slash', function () {
      expect(prependPath('/are/so/cool', '/')).to.be('//are/so/cool');
    });

    it('when there is a slash on the end', function () {
      expect(prependPath('/are/delicious/', 'lollipops')).to.be('lollipops/are/delicious/');
    });

    it('when pathname that ends with a file', function () {
      expect(prependPath('/are/delicious/index.html', 'donuts')).to.be(
        'donuts/are/delicious/index.html'
      );
    });

    it('when it is only a slash', function () {
      expect(prependPath('/', 'kittens')).to.be('kittens/');
    });
  });
});
