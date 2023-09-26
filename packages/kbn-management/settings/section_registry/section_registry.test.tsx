/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { SectionRegistry } from './section_registry';

describe('SectionRegistry', () => {
  let registry = new SectionRegistry();

  beforeEach(() => {
    registry = new SectionRegistry();
  });

  describe('register', () => {
    it('should allow a global component to be registered', () => {
      const Component = () => <div />;
      const queryMatch = () => true;
      registry.setup.addGlobalSection(Component, queryMatch);

      const entries = registry.start.getGlobalSections();
      expect(entries).toHaveLength(1);
      expect(entries[0].Component).toBe(Component);
      expect(entries[0].queryMatch).toBe(queryMatch);
      expect(registry.start.getSpacesSections()).toHaveLength(0);
    });

    it('should allow a spaces component to be registered', () => {
      const Component = () => <div />;
      const queryMatch = () => true;
      registry.setup.addSpaceSection(Component, queryMatch);

      const entries = registry.start.getSpacesSections();
      expect(entries).toHaveLength(1);
      expect(entries[0].Component).toBe(Component);
      expect(entries[0].queryMatch).toBe(queryMatch);
      expect(registry.start.getGlobalSections()).toHaveLength(0);
    });
  });
});
