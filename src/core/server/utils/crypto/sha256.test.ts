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

import { createSHA256Hash } from './sha256';

describe('createSHA256Hash', () => {
  it('creates a hex-encoded hash by default', () => {
    expect(createSHA256Hash('foo')).toMatchInlineSnapshot(
      `"2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae"`
    );
  });

  it('allows the output encoding to be changed', () => {
    expect(createSHA256Hash('foo', 'base64')).toMatchInlineSnapshot(
      `"LCa0a2j/xo/5m0U8HTBBNBNCLXBkg7+g+YpeiGJm564="`
    );
  });

  it('accepts a buffer as input', () => {
    const data = Buffer.from('foo', 'utf8');
    expect(createSHA256Hash(data)).toEqual(createSHA256Hash('foo'));
  });
});
