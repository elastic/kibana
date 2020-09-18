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

import * as Either from '../either';
import { noop } from '../utils';
import expect from '@kbn/expect';

const pluck = (x) => (obj) => obj[x];
const expectNull = (x) => expect(x).to.equal(null);
const attempt = (obj) => Either.fromNullable(obj).map(pluck('detail'));

describe(`either datatype functions`, () => {
  describe(`helpers`, () => {
    it(`'fromNullable' should be a fn`, () => {
      expect(typeof Either.fromNullable).to.be('function');
    });
    it(`' Either.tryCatch' should be a fn`, () => {
      expect(typeof Either.tryCatch).to.be('function');
    });
    it(`'left' should be a fn`, () => {
      expect(typeof Either.left).to.be('function');
    });
    it(`'right' should be a fn`, () => {
      expect(typeof Either.right).to.be('function');
    });
  });
  describe(' Either.tryCatch', () => {
    let sut = undefined;
    it(`should return a 'Left' on error`, () => {
      sut = Either.tryCatch(() => {
        throw new Error('blah');
      });
      expect(sut.inspect()).to.be('Left(Error: blah)');
    });
    it(`should return a 'Right' on successful execution`, () => {
      sut = Either.tryCatch(noop);
      expect(sut.inspect()).to.be('Right(undefined)');
    });
  });
  describe(`'fromNullable`, () => {
    it(`should continue processing if a truthy is calculated`, () => {
      attempt({ detail: 'x' }).fold(
        () => {},
        (x) => expect(x).to.equal('x')
      );
    });
    it(`should drop processing if a falsey is calculated`, () => {
      attempt(false).fold(expectNull, () => {});
    });
  });
});
