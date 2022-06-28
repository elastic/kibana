/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createAbsolutePathSerializer } from '@kbn/jest-serializers';

import { displayHelp, processOptions } from './args';

jest.mock('../../../functional_test_runner/lib/es_version', () => {
  return {
    EsVersion: class {
      static getDefault() {
        return '999.999.999';
      }
    },
  };
});

expect.addSnapshotSerializer(createAbsolutePathSerializer(process.cwd()));

const INITIAL_TEST_ES_FROM = process.env.TEST_ES_FROM;
beforeEach(() => {
  process.env.TEST_ES_FROM = 'snapshot';
});
afterEach(() => {
  process.env.TEST_ES_FROM = INITIAL_TEST_ES_FROM;
});

describe('display help for run tests CLI', () => {
  it('displays as expected', () => {
    expect(displayHelp()).toMatchSnapshot();
  });
});

describe('process options for run tests CLI', () => {
  it('rejects boolean config value', () => {
    expect(() => {
      processOptions({ config: true });
    }).toThrow('functional_tests: invalid argument [true] to option [config]');
  });

  it('rejects empty config value if no default passed', () => {
    expect(() => {
      processOptions({});
    }).toThrow('functional_tests: config is required');
  });

  it('accepts empty config value if default passed', () => {
    const options = processOptions({ config: '' }, ['foo']);
    expect(options).toMatchSnapshot();
  });

  it('rejects non-boolean value for bail', () => {
    expect(() => {
      processOptions({ bail: 'peanut' }, ['foo']);
    }).toThrow('functional_tests: invalid argument [peanut] to option [bail]');
  });

  it('accepts string value for kibana-install-dir', () => {
    const options = processOptions({ 'kibana-install-dir': 'foo' }, ['foo']);
    expect(options).toMatchSnapshot();
  });

  it('rejects boolean value for kibana-install-dir', () => {
    expect(() => {
      processOptions({ 'kibana-install-dir': true }, ['foo']);
    }).toThrow('functional_tests: invalid argument [true] to option [kibana-install-dir]');
  });

  it('accepts boolean value for updateBaselines', () => {
    const options = processOptions({ updateBaselines: true }, ['foo']);
    expect(options).toMatchSnapshot();
  });

  it('accepts boolean value for updateSnapshots', () => {
    const options = processOptions({ updateSnapshots: true }, ['foo']);
    expect(options).toMatchSnapshot();
  });

  it('accepts source value for esFrom', () => {
    const options = processOptions({ esFrom: 'source' }, ['foo']);
    expect(options).toMatchSnapshot();
  });

  it('accepts source value for $TEST_ES_FROM', () => {
    process.env.TEST_ES_FROM = 'source';
    const options = processOptions({}, ['foo']);
    expect(options).toMatchSnapshot();
  });

  it('prioritizes source flag over $TEST_ES_FROM', () => {
    process.env.TEST_ES_FROM = 'source';
    const options = processOptions({ esFrom: 'snapshot' }, ['foo']);
    expect(options).toMatchSnapshot();
  });

  it('rejects non-enum value for esFrom', () => {
    expect(() => {
      processOptions({ esFrom: 'butter' }, ['foo']);
    }).toThrow('functional_tests: invalid argument [butter] to option [esFrom]');
  });

  it('accepts value for grep', () => {
    const options = processOptions({ grep: 'management' }, ['foo']);
    expect(options).toMatchSnapshot();
  });

  it('accepts debug option', () => {
    const options = processOptions({ debug: true }, ['foo']);
    expect(options).toMatchSnapshot();
  });

  it('accepts silent option', () => {
    const options = processOptions({ silent: true }, ['foo']);
    expect(options).toMatchSnapshot();
  });

  it('accepts quiet option', () => {
    const options = processOptions({ quiet: true }, ['foo']);
    expect(options).toMatchSnapshot();
  });

  it('accepts verbose option', () => {
    const options = processOptions({ verbose: true }, ['foo']);
    expect(options).toMatchSnapshot();
  });

  it('accepts extra server options', () => {
    const options = processOptions({ _: { 'server.foo': 'bar' } }, ['foo']);
    expect(options).toMatchSnapshot();
  });

  it('rejects invalid options even if valid options exist', () => {
    expect(() => {
      processOptions({ debug: true, aintnothang: true, bail: true }, ['foo']);
    }).toThrow('functional_tests: invalid option [aintnothang]');
  });
});
