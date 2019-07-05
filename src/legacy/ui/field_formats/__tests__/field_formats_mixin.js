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
import sinon from 'sinon';

import { FieldFormat } from '../field_format';
import * as FieldFormatsServiceNS from '../field_formats_service';
import { fieldFormatsMixin } from '../field_formats_mixin';

describe('server.registerFieldFormat(createFormat)', () => {
  const sandbox = sinon.createSandbox();

  let registerFieldFormat;
  let fieldFormatServiceFactory;
  const serverMock = { decorate() {} };
  beforeEach(async () => {
    sandbox.stub(serverMock);
    await fieldFormatsMixin({}, serverMock);
    [[,, fieldFormatServiceFactory], [,, registerFieldFormat]] = serverMock.decorate.args;
  });

  afterEach(() => sandbox.restore());

  it('throws if createFormat is not a function', () => {
    expect(() => registerFieldFormat()).to.throwError(error => {
      expect(error.message).to.match(/createFormat is not a function/i);
    });
  });

  it('calls the createFormat() function with the FieldFormat class', () => {
    const createFormat = sinon.stub();
    registerFieldFormat(createFormat);
    sinon.assert.calledOnce(createFormat);
    sinon.assert.calledWithExactly(createFormat, sinon.match.same(FieldFormat));
  });

  it('passes the returned class to the FieldFormatsService', async () => {
    const { FieldFormatsService: ActualFFS } = FieldFormatsServiceNS;
    sandbox.stub(FieldFormatsServiceNS, 'FieldFormatsService').callsFake((...args) => {
      return new ActualFFS(...args);
    });

    const { FieldFormatsService } = FieldFormatsServiceNS;
    class FooFormat {
      static id = 'foo'
    }
    registerFieldFormat(() => FooFormat);

    const fieldFormats = await fieldFormatServiceFactory({
      getAll: () => ({}),
      getDefaults: () => ({})
    });

    sinon.assert.calledOnce(FieldFormatsService);
    sinon.assert.calledWithExactly(
      FieldFormatsService,
      // array of fieldFormat classes
      [sinon.match.same(FooFormat)],
      // getConfig() function
      sinon.match.func
    );

    const format = fieldFormats.getInstance({ id: 'foo' });
    expect(format).to.be.a(FooFormat);
  });
});
