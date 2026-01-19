/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { omit } from 'lodash';
import { getSampleOrderedLayout } from '../test_utils/sample_layout';
import { combinePanels, deleteSection } from './section_management';

describe('section management', () => {
  describe('combine panels', () => {
    it('move panels from one row to another populated row', () => {
      const originalLayout = getSampleOrderedLayout();
      const combined = combinePanels(originalLayout.third.panels, originalLayout['main-0'].panels);
      expect(Object.keys(combined).length).toEqual(
        Object.keys(originalLayout.third.panels).length +
          Object.keys(originalLayout['main-0'].panels).length
      );

      // only the new panel's row is different, since no compaction was necessary
      const newPanel = combined.panel10;
      expect(newPanel.row).toBe(14);
      expect(omit(newPanel, 'row')).toEqual(omit(originalLayout.third.panels.panel10, 'row'));
    });

    it('move panels from one row to another empty row', () => {
      const originalLayout = getSampleOrderedLayout();
      const combined = combinePanels({}, originalLayout.second.panels);
      expect(Object.keys(combined).length).toEqual(
        Object.keys(originalLayout.second.panels).length
      );
      // if no panels in new row, then just send all panels to new row with no changes
      Object.values(originalLayout.second.panels).forEach((panel) => {
        expect(panel).toEqual(combined[panel.id]); // deep equal
      });
    });
  });

  describe('delete row', () => {
    it('delete existing row', () => {
      const originalLayout = getSampleOrderedLayout();
      const newLayout = deleteSection(originalLayout, 'second');

      // modification happens by value and not by reference
      expect(originalLayout.second).toBeDefined();
      expect(newLayout.second).not.toBeDefined();
    });

    it('delete non-existant row', () => {
      const originalLayout = getSampleOrderedLayout();
      expect(() => {
        const newLayout = deleteSection(originalLayout, 'fake');
        expect(newLayout.fake).not.toBeDefined();
      }).not.toThrow();
    });
  });
});
