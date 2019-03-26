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
import { IE_REGEX } from '../url_overflow_service.js';

describe('IE_REGEX', () => {
  it('should detect IE 9', () => {
    const userAgent = 'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)';
    expect(IE_REGEX.test(userAgent)).to.be(true);
  });

  it('should detect IE 10', () => {
    const userAgent = 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.2; Win64; x64; Trident/6.0)';
    expect(IE_REGEX.test(userAgent)).to.be(true);
  });

  it('should detect IE 11', () => {
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; .NET4.0C; .NET4.0E; ' +
      '.NET CLR 2.0.50727; .NET CLR 3.0.30729; .NET CLR 3.5.30729; rv:11.0) like Gecko';
    expect(IE_REGEX.test(userAgent)).to.be(true);
  });

  it('should detect Edge', () => {
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/13.10586';
    expect(IE_REGEX.test(userAgent)).to.be(true);
  });

  it('should not detect Chrome on MacOS', () => {
    const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_5) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/59.0.3071.115 Safari/537.36';
    expect(IE_REGEX.test(userAgent)).to.be(false);
  });

  it('should not detect Chrome on Windows', () => {
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36';
    expect(IE_REGEX.test(userAgent)).to.be(false);
  });

  it('should not detect Safari on MacOS', () => {
    const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_5) AppleWebKit/603.2.4 ' +
      '(KHTML, like Gecko) Version/10.1.1 Safari/603.2.4';
    expect(IE_REGEX.test(userAgent)).to.be(false);
  });

  it('should not detect Firefox on MacOS', () => {
    const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.12; rv:46.0) Gecko/20100101 Firefox/46.0';
    expect(IE_REGEX.test(userAgent)).to.be(false);
  });

  it('should not detect Firefox on Windows', () => {
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:46.0) Gecko/20100101 Firefox/46.0';
    expect(IE_REGEX.test(userAgent)).to.be(false);
  });
});
