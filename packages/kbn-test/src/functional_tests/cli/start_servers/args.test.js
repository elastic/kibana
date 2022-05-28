/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { displayHelp, processOptions } from './args';
import { createAbsolutePathSerializer } from '@kbn/jest-serializers';

expect.addSnapshotSerializer(createAbsolutePathSerializer(process.cwd()));

const INITIAL_TEST_ES_FROM = process.env.TEST_ES_FROM;
beforeEach(() => {
  process.env.TEST_ES_FROM = 'snapshot';
});
afterEach(() => {
  process.env.TEST_ES_FROM = INITIAL_TEST_ES_FROM;
});

describe('display help for start servers CLI', () => {
  it('displays as expected', () => {
    expect(displayHelp()).toMatchSnapshot();
  });
});

describe('process options for start servers CLI', () => {
  it('rejects boolean config value', () => {
    expect(() => {
      processOptions({ config: true });
    }).toThrow('functional_tests_server: invalid argument [true] to option [config]');
  });

  it('rejects empty config value if no default passed', () => {
    expect(() => {
      processOptions({});
    }).toThrow('functional_tests_server: config is required');
  });

  it('accepts empty config value if default passed', () => {
    const options = processOptions({ config: '' }, 'foo');
    expect(options).toMatchSnapshot();
  });

  it('rejects invalid option', () => {
    expect(() => {
      processOptions({ bail: true }, 'foo');
    }).toThrow('functional_tests_server: invalid option [bail]');
  });

  it('accepts string value for kibana-install-dir', () => {
    const options = processOptions({ 'kibana-install-dir': 'foo' }, 'foo');
    expect(options).toMatchSnapshot();
  });

  it('rejects boolean value for kibana-install-dir', () => {
    expect(() => {
      processOptions({ 'kibana-install-dir': true }, 'foo');
    }).toThrow('functional_tests_server: invalid argument [true] to option [kibana-install-dir]');
  });

  it('accepts source value for esFrom', () => {
    const options = processOptions({ esFrom: 'source' }, 'foo');
    expect(options).toMatchSnapshot();
  });

  it('accepts source value for $TEST_ES_FROM', () => {
    process.env.TEST_ES_FROM = 'source';
    const options = processOptions({}, 'foo');
    expect(options).toMatchSnapshot();
  });

  it('prioritizes source flag over $TEST_ES_FROM', () => {
    process.env.TEST_ES_FROM = 'source';
    const options = processOptions({ esFrom: 'snapshot' }, 'foo');
    expect(options).toMatchSnapshot();
  });

  it('accepts debug option', () => {
    const options = processOptions({ debug: true }, 'foo');
    expect(options).toMatchSnapshot();
  });

  it('accepts silent option', () => {
    const options = processOptions({ silent: true }, 'foo');
    expect(options).toMatchSnapshot();
  });

  it('accepts quiet option', () => {
    const options = processOptions({ quiet: true }, 'foo');
    expect(options).toMatchSnapshot();
  });

  it('accepts verbose option', () => {
    const options = processOptions({ verbose: true }, 'foo');
    expect(options).toMatchSnapshot();
  });

  it('accepts extra server options', () => {
    const options = processOptions({ _: { 'server.foo': 'bar' } }, 'foo');
    expect(options).toMatchSnapshot();
  });

  it('rejects invalid options even if valid options exist', () => {
    expect(() => {
      processOptions({ debug: true, aintnothang: true, bail: true }, 'foo');
    }).toThrow('functional_tests_server: invalid option [aintnothang]');
  });
});
