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

import expect from 'expect.js';
import sinon from 'sinon';

import { errorIfXPackInstall, errorIfXPackRemove } from '../error_if_x_pack';

describe('error_if_xpack', () => {
  const logger = {
    error: sinon.stub()
  };

  beforeEach(() => {
    sinon.stub(process, 'exit');
  });

  it('should exit on install if x-pack by name', () => {
    errorIfXPackInstall({
      plugin: 'x-pack'
    }, logger);
    expect(process.exit.called).to.be(true);
  });

  it('should exit on install if x-pack by url', () => {
    errorIfXPackInstall({
      plugin: ' http://localhost/x-pack/x-pack-7.0.0-alpha1-SNAPSHOT.zip'
    }, logger);
    expect(process.exit.called).to.be(true);
  });

  it('should not exit on install if not x-pack', () => {
    errorIfXPackInstall({
      plugin: 'foo'
    }, logger);
    expect(process.exit.called).to.be(false);
  });

  it('should exit on remove if x-pack', () => {
    errorIfXPackRemove({
      plugin: 'x-pack'
    }, logger);
    expect(process.exit.called).to.be(true);
  });

  it('should not exit on remove if not x-pack', () => {
    errorIfXPackRemove({
      plugin: 'bar'
    }, logger);
    expect(process.exit.called).to.be(false);
  });

  afterEach(() => {
    process.exit.restore();
  });
});
