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
    it('rejects boolean config value', () => {
      expect(() => {
        processOptions({ config: true });
      }).toThrow(
        'functional_tests_server: invalid argument [true] to option [config]'
      );
    });

    it('rejects empty config value if no default passed', () => {
      expect(() => {
        processOptions({});
      }).toThrow('functional_tests_server: config is required');
    });

    it('accepts empty config value if default passed', () => {
      expect(() => {
        processOptions({ config: '' }, ['foo']);
      }).not.toThrow();
    });

    it('rejects bail', () => {
      expect(() => {
        processOptions({ bail: 'peanut' }, ['foo']);
      }).toThrow('functional_tests_server: invalid option [bail]');
    });

    it('accepts string value for kibana-install-dir', () => {
      expect(() => {
        processOptions({ 'kibana-install-dir': 'foo' }, ['foo']);
      }).not.toThrow();
    });

    it('rejects boolean value for kibana-install-dir', () => {
      expect(() => {
        processOptions({ 'kibana-install-dir': true }, ['foo']);
      }).toThrow(
        'functional_tests_server: invalid argument [true] to option [kibana-install-dir]'
      );
    });

    it('accepts source value for es-from', () => {
      expect(() => {
        processOptions({ 'es-from': 'source' }, ['foo']);
      }).not.toThrow();
    });

    it('rejects non-enum value for es-from', () => {
      expect(() => {
        processOptions({ 'es-from': 'butter' }, ['foo']);
      }).toThrow(
        'functional_tests_server: invalid argument [butter] to option [es-from]'
      );
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
      }).toThrow('functional_tests_server: invalid option [aintnothang]');
    });
  });
});
