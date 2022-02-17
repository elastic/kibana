/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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

  describe('custom status check', () => {
    test('returns undefined when name is customStatusCheckName is empty', () => {
      const service = new TutorialService();
      expect(service.getCustomStatusCheck('')).toBeUndefined();
    });
    test('returns undefined when custom status check was not registered', () => {
      const service = new TutorialService();
      expect(service.getCustomStatusCheck('foo')).toBeUndefined();
    });
    test('returns custom status check', () => {
      const service = new TutorialService();
      const callback = jest.fn();
      service.setup().registerCustomStatusCheck('foo', callback);
      const customStatusCheckCallback = service.getCustomStatusCheck('foo');
      expect(customStatusCheckCallback).toBeDefined();
      customStatusCheckCallback();
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('custom component', () => {
    test('returns undefined when name is customComponentName is empty', () => {
      const service = new TutorialService();
      expect(service.getCustomComponent('')).toBeUndefined();
    });
    test('returns undefined when custom component was not registered', () => {
      const service = new TutorialService();
      expect(service.getCustomComponent('foo')).toBeUndefined();
    });
    test('returns custom component', async () => {
      const service = new TutorialService();
      const customComponent = <div>foo</div>;
      service.setup().registerCustomComponent('foo', async () => customComponent);
      const customStatusCheckCallback = service.getCustomComponent('foo');
      expect(customStatusCheckCallback).toBeDefined();
      const result = await customStatusCheckCallback();
      expect(result).toEqual(customComponent);
    });
  });
});
