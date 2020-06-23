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

const parseSheet = require('./parse_sheet');

const expect = require('chai').expect;

describe('timelion parse_sheet function', function () {
  it(`doesn't split expressions on whitespace`, async function () {
    const data = ['.es() .es(404)'];
    const ast = parseSheet(data);

    const expressions = ast[0];
    expect(expressions.length).to.equal(1);
    expect(expressions[0].type).to.equal('chain');
  });

  it('splits expressions on commas', function () {
    const data = ['.es(), .es(404)'];
    const ast = parseSheet(data);

    const expressions = ast[0];
    expect(expressions.length).to.equal(2);
    expect(expressions[0].type).to.equal('chain');
    expect(expressions[1].type).to.equal('chain');
  });

  it('splits expressions on newlines', function () {
    const data = [`.es()\n\r ,\n\r .es(404)`];
    const ast = parseSheet(data);

    const expressions = ast[0];
    expect(expressions.length).to.equal(2);
    expect(expressions[0].type).to.equal('chain');
    expect(expressions[1].type).to.equal('chain');
  });
});
