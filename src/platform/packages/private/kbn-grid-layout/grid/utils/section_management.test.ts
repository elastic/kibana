/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { omit } from 'lodash';
import { getSampleLayout } from '../test_utils/sample_layout';
import { GridLayoutData } from '../types';
import { deleteRow, movePanelsToRow } from './section_management';

describe('row management', () => {
  describe('move panels to row', () => {
    const checkPanelCountsAfterMove = (
      originalLayout: GridLayoutData,
      newLayout: GridLayoutData,
      startingRow: string,
      newRow: string
    ) => {
      // panels are removed from the starting row
      expect(newLayout[startingRow].panels).toEqual({});
      // and added to the new row
      expect(Object.keys(newLayout[newRow].panels).length).toEqual(
        Object.keys(originalLayout[newRow].panels).length +
          Object.keys(originalLayout[startingRow].panels).length
      );
    };

    it('move panels from one row to another populated row', () => {
      const originalLayout = getSampleLayout();
      const newLayout = movePanelsToRow(originalLayout, 'third', 'first');
      checkPanelCountsAfterMove(originalLayout, newLayout, 'third', 'first');

      // existing panels in new row do not move
      Object.values(originalLayout.first.panels).forEach((panel) => {
        expect(panel).toEqual(newLayout.first.panels[panel.id]); // deep equal
      });
      // only the new panel's row is different, since no compaction was necessary
      const newPanel = newLayout.first.panels.panel10;
      expect(newPanel.row).toBe(14);
      expect(omit(newPanel, 'row')).toEqual(omit(originalLayout.third.panels.panel10, 'row'));
    });

    it('move panels from one row to another empty row', () => {
      const originalLayout = {
        first: {
          title: 'Large section',
          isCollapsed: false,
          id: 'first',
          order: 0,
          panels: {},
        },
        second: {
          title: 'Another section',
          isCollapsed: false,
          id: 'second',
          order: 1,
          panels: getSampleLayout().first.panels,
        },
      };
      const newLayout = movePanelsToRow(originalLayout, 'second', 'first');
      checkPanelCountsAfterMove(originalLayout, newLayout, 'second', 'first');

      // if no panels in new row, then just send all panels to new row with no changes
      Object.values(originalLayout.second.panels).forEach((panel) => {
        expect(panel).toEqual(newLayout.first.panels[panel.id]); // deep equal
      });
    });
  });

  describe('delete row', () => {
    it('delete existing row', () => {
      const originalLayout = getSampleLayout();
      const newLayout = deleteRow(originalLayout, 'first');

      // modification happens by value and not by reference
      expect(originalLayout.first).toBeDefined();
      expect(newLayout.first).not.toBeDefined();
    });

    it('delete non-existant row', () => {
      const originalLayout = getSampleLayout();
      expect(() => {
        const newLayout = deleteRow(originalLayout, 'fake');
        expect(newLayout.fake).not.toBeDefined();
      }).not.toThrow();
    });
  });
});
