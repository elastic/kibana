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
