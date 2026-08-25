/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { AddDataService } from './add_data_service';

describe('AddDataService', () => {
  describe('setup', () => {
    test('allows multiple register directory header link calls', () => {
      const setup = new AddDataService().setup();
      expect(() => {
        setup.registerAddDataTab({ id: 'abc', name: 'a b c', getComponent: () => <a>123</a> });
        setup.registerAddDataTab({ id: 'def', name: 'a b c', getComponent: () => <a>456</a> });
      }).not.toThrow();
    });

    test('throws when same directory header link is registered twice', () => {
      const setup = new AddDataService().setup();
      expect(() => {
        setup.registerAddDataTab({ id: 'abc', name: 'a b c', getComponent: () => <a>123</a> });
        setup.registerAddDataTab({ id: 'abc', name: 'a b c', getComponent: () => <a>456</a> });
      }).toThrow();
    });
  });

  describe('getDirectoryHeaderLinks', () => {
    test('returns empty array', () => {
      const service = new AddDataService();
      expect(service.getAddDataTabs()).toEqual([]);
    });

    test('returns last state of register calls', () => {
      const service = new AddDataService();
      const setup = service.setup();
      const links = [
        { id: 'abc', name: 'a b c', getComponent: () => <a>123</a> },
        { id: 'def', name: 'a b c', getComponent: () => <a>456</a> },
      ];
      setup.registerAddDataTab(links[0]);
      setup.registerAddDataTab(links[1]);
      expect(service.getAddDataTabs()).toEqual(links);
    });
  });
});
