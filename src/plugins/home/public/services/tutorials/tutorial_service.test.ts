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

import { TutorialService } from './tutorial_service';

describe('TutorialService', () => {
  describe('setup', () => {
    test('allows multiple set calls', () => {
      const setup = new TutorialService().setup();
      expect(() => {
        setup.setVariable('abc', 123);
        setup.setVariable('def', 456);
      }).not.toThrow();
    });

    test('throws when same variable is set twice', () => {
      const setup = new TutorialService().setup();
      expect(() => {
        setup.setVariable('abc', 123);
        setup.setVariable('abc', 456);
      }).toThrow();
    });
  });

  describe('start', () => {
    test('returns empty object', () => {
      const service = new TutorialService();
      expect(service.start().get()).toEqual({});
    });

    test('returns last state of update calls', () => {
      const service = new TutorialService();
      const setup = service.setup();
      setup.setVariable('abc', 123);
      setup.setVariable('def', { subKey: 456 });
      expect(service.start().get()).toEqual({ abc: 123, def: { subKey: 456 } });
    });
  });
});
