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
const mockI18n = jest.fn();
jest.mock('@kbn/i18n', () => ({
  i18n: {
    init: mockI18n,
  },
}));
import { I18nService } from './i18n_service';
describe('#start()', () => {
  let injectedMetadata: any;
  const translations = {
    locale: 'ch',
    formats: {},
  };
  beforeEach(() => {
    injectedMetadata = {
      getLegacyMetadata: jest.fn().mockReturnValue({ translations }),
    } as any;
  });
  it('should call start method with translations', async () => {
    const i18nService = new I18nService();
    expect(mockI18n).not.toHaveBeenCalled();
    i18nService.start({ injectedMetadata });
    expect(mockI18n.mock.calls).toMatchSnapshot();
  });
});
