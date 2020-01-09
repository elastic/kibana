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

const render = jest.fn();
const unmountComponentAtNode = jest.fn();

jest.doMock('react-dom', () => ({ render, unmountComponentAtNode }));

jest.mock('ui/chrome', () => ({
  getUiSettingsClient: () => ({
    get: () => '',
  }),
  addBasePath: () => {},
}));

jest.mock('ui/i18n', () => ({
  I18nContext: () => {},
}));

const { renderCreateIndexPatternWizard, destroyCreateIndexPatternWizard } = require('../render');

describe('CreateIndexPatternWizardRender', () => {
  beforeEach(() => {
    jest.spyOn(document, 'getElementById').mockImplementation(() => ({}));
    render.mockClear();
    unmountComponentAtNode.mockClear();
  });

  it('should call render', () => {
    renderCreateIndexPatternWizard('', {
      es: {},
      indexPatterns: {},
      savedObjectsClient: {},
      config: {},
      changeUrl: () => {},
      indexPatternCreationType: {},
    });

    expect(render.mock.calls.length).toBe(1);
  });

  it('should call unmountComponentAtNode', () => {
    destroyCreateIndexPatternWizard();
    expect(unmountComponentAtNode.mock.calls.length).toBe(1);
  });
});
