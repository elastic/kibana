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
import React from 'react';
import { TutorialService } from './tutorial_service';

describe('TutorialService', () => {
  describe('setup', () => {
    test('allows multiple set variable calls', () => {
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

    test('allows multiple register directory notice calls', () => {
      const setup = new TutorialService().setup();
      expect(() => {
        setup.registerDirectoryNotice('abc', () => <div />);
        setup.registerDirectoryNotice('def', () => <span />);
      }).not.toThrow();
    });

    test('throws when same directory notice is registered twice', () => {
      const setup = new TutorialService().setup();
      expect(() => {
        setup.registerDirectoryNotice('abc', () => <div />);
        setup.registerDirectoryNotice('abc', () => <span />);
      }).toThrow();
    });

    test('allows multiple register directory header link calls', () => {
      const setup = new TutorialService().setup();
      expect(() => {
        setup.registerDirectoryHeaderLink('abc', () => <a>123</a>);
        setup.registerDirectoryHeaderLink('def', () => <a>456</a>);
      }).not.toThrow();
    });

    test('throws when same directory header link is registered twice', () => {
      const setup = new TutorialService().setup();
      expect(() => {
        setup.registerDirectoryHeaderLink('abc', () => <a>123</a>);
        setup.registerDirectoryHeaderLink('abc', () => <a>456</a>);
      }).toThrow();
    });

    test('allows multiple register module notice calls', () => {
      const setup = new TutorialService().setup();
      expect(() => {
        setup.registerModuleNotice('abc', () => <div />);
        setup.registerModuleNotice('def', () => <span />);
      }).not.toThrow();
    });

    test('throws when same module notice is registered twice', () => {
      const setup = new TutorialService().setup();
      expect(() => {
        setup.registerModuleNotice('abc', () => <div />);
        setup.registerModuleNotice('abc', () => <span />);
      }).toThrow();
    });
  });

  describe('getVariables', () => {
    test('returns empty object', () => {
      const service = new TutorialService();
      expect(service.getVariables()).toEqual({});
    });

    test('returns last state of update calls', () => {
      const service = new TutorialService();
      const setup = service.setup();
      setup.setVariable('abc', 123);
      setup.setVariable('def', { subKey: 456 });
      expect(service.getVariables()).toEqual({ abc: 123, def: { subKey: 456 } });
    });
  });

  describe('getDirectoryNotices', () => {
    test('returns empty array', () => {
      const service = new TutorialService();
      expect(service.getDirectoryNotices()).toEqual([]);
    });

    test('returns last state of register calls', () => {
      const service = new TutorialService();
      const setup = service.setup();
      const notices = [() => <div />, () => <span />];
      setup.registerDirectoryNotice('abc', notices[0]);
      setup.registerDirectoryNotice('def', notices[1]);
      expect(service.getDirectoryNotices()).toEqual(notices);
    });
  });

  describe('getDirectoryHeaderLinks', () => {
    test('returns empty array', () => {
      const service = new TutorialService();
      expect(service.getDirectoryHeaderLinks()).toEqual([]);
    });

    test('returns last state of register calls', () => {
      const service = new TutorialService();
      const setup = service.setup();
      const links = [() => <a>123</a>, () => <a>456</a>];
      setup.registerDirectoryHeaderLink('abc', links[0]);
      setup.registerDirectoryHeaderLink('def', links[1]);
      expect(service.getDirectoryHeaderLinks()).toEqual(links);
    });
  });

  describe('getModuleNotices', () => {
    test('returns empty array', () => {
      const service = new TutorialService();
      expect(service.getModuleNotices()).toEqual([]);
    });

    test('returns last state of register calls', () => {
      const service = new TutorialService();
      const setup = service.setup();
      const notices = [() => <div />, () => <span />];
      setup.registerModuleNotice('abc', notices[0]);
      setup.registerModuleNotice('def', notices[1]);
      expect(service.getModuleNotices()).toEqual(notices);
    });
  });
});
