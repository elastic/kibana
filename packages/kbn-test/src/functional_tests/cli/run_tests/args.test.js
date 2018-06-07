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

import { processOptions } from './args';

describe('process options for run tests CLI', () => {
  describe('options', () => {
    const originalObjects = {};
    // mocking instead of spying so that no output is sent to the test results
    const logMock = jest.fn();

    beforeAll(() => {
      originalObjects.console = console;
      global.console = { log: logMock };
    });

    afterAll(() => {
      global.console = originalObjects.console;
    });

    beforeEach(() => {
      jest.resetAllMocks();
    });

    it('rejects boolean config value', () => {
      expect(() => {
        processOptions({ config: true });
      }).toThrow();

      expect(logMock.mock.calls[0][0]).toContain(
        'functional_tests: invalid argument [true] to option [config]'
      );
    });

    it('rejects empty config value if no default passed', () => {
      expect(() => {
        processOptions({});
      }).toThrow();

      expect(logMock.mock.calls[0][0]).toContain(
        'functional_tests: config is required'
      );
    });

    it('accepts empty config value if default passed', () => {
      expect(() => {
        processOptions({ config: '' }, ['foo']);
      }).not.toThrow();
    });

    it('rejects non-boolean value for bail', () => {
      expect(() => {
        processOptions({ bail: 'peanut' }, ['foo']);
      }).toThrow();

      expect(logMock.mock.calls[0][0]).toContain(
        'functional_tests: invalid argument [peanut] to option [bail]'
      );
    });

    it('accepts string value for kibana-install-dir', () => {
      expect(() => {
        processOptions({ 'kibana-install-dir': 'foo' }, ['foo']);
      }).not.toThrow();
    });

    it('rejects boolean value for kibana-install-dir', () => {
      expect(() => {
        processOptions({ 'kibana-install-dir': true }, ['foo']);
      }).toThrow();

      expect(logMock.mock.calls[0][0]).toContain(
        'functional_tests: invalid argument [true] to option [kibana-install-dir]'
      );
    });

    it('accepts boolean value for updateBaselines', () => {
      expect(() => {
        processOptions({ updateBaselines: true }, ['foo']);
      }).not.toThrow();
    });

    it('accepts source value for es-from', () => {
      expect(() => {
        processOptions({ 'es-from': 'source' }, ['foo']);
      }).not.toThrow();
    });

    it('rejects non-enum value for es-from', () => {
      expect(() => {
        processOptions({ 'es-from': 'butter' }, ['foo']);
      }).toThrow();

      expect(logMock.mock.calls[0][0]).toContain(
        'functional_tests: invalid argument [butter] to option [es-from]'
      );
    });

    it('accepts value for grep', () => {
      expect(() => {
        processOptions({ grep: 'management' }, ['foo']);
      }).not.toThrow();
    });

    it('accepts debug option', () => {
      expect(() => {
        processOptions({ debug: true }, ['foo']);
      }).not.toThrow();
    });

    it('accepts silent option', () => {
      expect(() => {
        processOptions({ silent: true }, ['foo']);
      }).not.toThrow();
    });

    it('accepts quiet option', () => {
      expect(() => {
        processOptions({ quiet: true }, ['foo']);
      }).not.toThrow();
    });

    it('accepts verbose option', () => {
      expect(() => {
        processOptions({ verbose: true }, ['foo']);
      }).not.toThrow();
    });

    it('accepts extra server options', () => {
      expect(() => {
        processOptions({ _: { 'server.foo': 'bar' } }, ['foo']);
      }).not.toThrow();
    });

    it('rejects invalid options even if valid options exist', () => {
      expect(() => {
        processOptions({ debug: true, aintnothang: true, bail: true }, ['foo']);
      }).toThrow();

      expect(logMock.mock.calls[0][0]).toContain(
        'functional_tests: invalid option [aintnothang]'
      );
    });
  });
});
