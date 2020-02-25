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

/**
 *  We don't have a lot of options for passing arguments to the page that karma
 *  creates, so we tack some query string params onto the test bundle script url.
 *
 *  This function finds that url by looking for a script tag that has
 *  the "/tests.bundle.js" segment
 *
 *  @return {string} url
 */
export function findTestBundleUrl() {
  const scriptTags = document.querySelectorAll('script[src]');
  const scriptUrls = [].map.call(scriptTags, el => el.getAttribute('src'));
  const testBundleUrl = scriptUrls.find(url => url.includes('/tests.bundle.js'));

  if (!testBundleUrl) {
    throw new Error("test bundle url couldn't be found");
  }

  return testBundleUrl;
}
