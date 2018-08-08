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

import {
  disableFilter,
  enableFilter,
  toggleFilterDisabled,
} from '../disable_filter';


describe('function disableFilter', function () {
  it('should disable a filter that is explicitly enabled', function () {
    const enabledFilter = {
      meta: {
        disabled: false,
      },
      match_all: {},
    };

    expect(disableFilter(enabledFilter).meta).to.have.property('disabled', true);
  });

  it('should disable a filter that is implicitly enabled', function () {
    const enabledFilter = {
      match_all: {},
    };

    expect(disableFilter(enabledFilter).meta).to.have.property('disabled', true);
  });

  it('should preserve other properties', function () {
    const enabledFilterWithProperties = {
      meta: {
        meta_property: 'META_PROPERTY',
      },
      match_all: {},
    };

    const disabledFilter = disableFilter(enabledFilterWithProperties);
    expect(disabledFilter).to.have.property('match_all', enabledFilterWithProperties.match_all);
    expect(disabledFilter.meta).to.have.property('meta_property', enabledFilterWithProperties.meta_property);
  });
});

describe('function enableFilter', function () {
  it('should enable a filter that is disabled', function () {
    const disabledFilter = {
      meta: {
        disabled: true,
      },
      match_all: {},
    };

    expect(enableFilter(disabledFilter).meta).to.have.property('disabled', false);
  });

  it('should explicitly enable a filter that is implicitly enabled', function () {
    const enabledFilter = {
      match_all: {},
    };

    expect(enableFilter(enabledFilter).meta).to.have.property('disabled', false);
  });

  it('should preserve other properties', function () {
    const enabledFilterWithProperties = {
      meta: {
        meta_property: 'META_PROPERTY',
      },
      match_all: {},
    };

    const enabledFilter = enableFilter(enabledFilterWithProperties);
    expect(enabledFilter).to.have.property('match_all', enabledFilterWithProperties.match_all);
    expect(enabledFilter.meta).to.have.property('meta_property', enabledFilterWithProperties.meta_property);
  });
});

describe('function toggleFilterDisabled', function () {
  it('should enable a filter that is disabled', function () {
    const disabledFilter = {
      meta: {
        disabled: true,
      },
      match_all: {},
    };

    expect(toggleFilterDisabled(disabledFilter).meta).to.have.property('disabled', false);
  });

  it('should disable a filter that is explicitly enabled', function () {
    const enabledFilter = {
      meta: {
        disabled: false,
      },
      match_all: {},
    };

    expect(toggleFilterDisabled(enabledFilter).meta).to.have.property('disabled', true);
  });

  it('should disable a filter that is implicitly enabled', function () {
    const enabledFilter = {
      match_all: {},
    };

    expect(toggleFilterDisabled(enabledFilter).meta).to.have.property('disabled', true);
  });

  it('should preserve other properties', function () {
    const enabledFilterWithProperties = {
      meta: {
        meta_property: 'META_PROPERTY',
      },
      match_all: {},
    };

    const disabledFilter = toggleFilterDisabled(enabledFilterWithProperties);
    expect(disabledFilter).to.have.property('match_all', enabledFilterWithProperties.match_all);
    expect(disabledFilter.meta).to.have.property('meta_property', enabledFilterWithProperties.meta_property);
  });
});
