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
import { fieldFormats } from 'ui/registry/field_formats';
describe('String Format', function() {
  const StringFormat = fieldFormats.getType('string');

  it('convert a string to lower case', function() {
    const string = new StringFormat({
      transform: 'lower',
    });
    expect(string.convert('Kibana')).to.be('kibana');
  });

  it('convert a string to upper case', function() {
    const string = new StringFormat({
      transform: 'upper',
    });
    expect(string.convert('Kibana')).to.be('KIBANA');
  });

  it('decode a base64 string', function() {
    const string = new StringFormat({
      transform: 'base64',
    });
    expect(string.convert('Zm9vYmFy')).to.be('foobar');
  });

  it('convert a string to title case', function() {
    const string = new StringFormat({
      transform: 'title',
    });
    expect(string.convert('PLEASE DO NOT SHOUT')).to.be('Please Do Not Shout');
    expect(string.convert('Mean, variance and standard_deviation.')).to.be(
      'Mean, Variance And Standard_deviation.'
    );
    expect(string.convert('Stay CALM!')).to.be('Stay Calm!');
  });

  it('convert a string to short case', function() {
    const string = new StringFormat({
      transform: 'short',
    });
    expect(string.convert('dot.notated.string')).to.be('d.n.string');
  });

  it('convert a string to unknown transform case', function() {
    const string = new StringFormat({
      transform: 'unknown_transform',
    });
    const value = 'test test test';
    expect(string.convert(value)).to.be(value);
  });
});
