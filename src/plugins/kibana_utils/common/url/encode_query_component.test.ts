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

import { encodeQueryComponent } from './encode_query_component';

describe('encodeUriQuery', function() {
  it('should correctly encode uri query and not encode chars defined as pchar set in rfc3986', () => {
    // don't encode alphanum
    expect(encodeQueryComponent('asdf1234asdf')).toBe('asdf1234asdf');

    // don't encode unreserved
    expect(encodeQueryComponent("-_.!~*'() -_.!~*'()")).toBe("-_.!~*'()+-_.!~*'()");

    // don't encode the rest of pchar
    expect(encodeQueryComponent(':@$, :@$,')).toBe(':@$,+:@$,');

    // encode '&', ';', '=', '+', and '#'
    expect(encodeQueryComponent('&;=+# &;=+#')).toBe('%26;%3D%2B%23+%26;%3D%2B%23');

    // encode ' ' as '+'
    expect(encodeQueryComponent('  ')).toBe('++');

    // encode ' ' as '%20' when a flag is used
    expect(encodeQueryComponent('  ', true)).toBe('%20%20');

    // do not encode `null` as '+' when flag is used
    expect(encodeQueryComponent('null', true)).toBe('null');

    // do not encode `null` with no flag
    expect(encodeQueryComponent('null')).toBe('null');
  });
});
