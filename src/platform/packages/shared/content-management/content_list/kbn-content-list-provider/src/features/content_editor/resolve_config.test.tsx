/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { CoreStart } from '@kbn/core/public';
import type { ContentInsightsClientPublic } from '@kbn/content-management-content-insights-public';
import {
  createDefaultOnSave,
  createActivityAppendRows,
  resolveContentEditorConfig,
  type ResolveContentEditorDeps,
} from './resolve_config';
import type { ContentListItem } from '../../item';
import type { ContentEditorConfig } from './types';

// Mock the DefaultActivityRows component.
jest.mock('./default_activity_rows', () => ({
  DefaultActivityRows: ({
    item,
    entityNamePlural,
  }: {
    item: ContentListItem;
    entityNamePlural: string;
  }) => (
    <div data-test-subj="mock-activity-rows">
      Activity for {item.id} ({entityNamePlural})
    </div>
  ),
}));

describe('resolve_config', () => {
  describe('createDefaultOnSave', () => {
    const createMockCore = (): CoreStart =>
      ({
        http: {
          get: jest.fn(),
          put: jest.fn(),
        },
      } as unknown as CoreStart);

    it('should return an onSave function', () => {
      const core = createMockCore();
      const onSave = createDefaultOnSave(core, 'dashboard');

      expect(typeof onSave).toBe('function');
    });

    it('should fetch current object to preserve non-tag references', async () => {
      const core = createMockCore();
      (core.http.get as jest.Mock).mockResolvedValue({
        references: [
          { type: 'index-pattern', id: 'ip-1', name: 'index-pattern-1' },
          { type: 'tag', id: 'old-tag', name: 'tag-old-tag' },
        ],
      });
      (core.http.put as jest.Mock).mockResolvedValue({});

      const onSave = createDefaultOnSave(core, 'dashboard');

      await onSave?.({
        id: 'dash-1',
        title: 'Updated Title',
        description: 'Updated Description',
        tags: ['new-tag-1', 'new-tag-2'],
      });

      expect(core.http.get).toHaveBeenCalledWith('/api/saved_objects/dashboard/dash-1');
    });

    it('should preserve non-tag references and replace tag references', async () => {
      const core = createMockCore();
      (core.http.get as jest.Mock).mockResolvedValue({
        references: [
          { type: 'index-pattern', id: 'ip-1', name: 'index-pattern-1' },
          { type: 'visualization', id: 'vis-1', name: 'visualization-1' },
          { type: 'tag', id: 'old-tag', name: 'tag-old-tag' },
        ],
      });
      (core.http.put as jest.Mock).mockResolvedValue({});

      const onSave = createDefaultOnSave(core, 'dashboard');

      await onSave?.({
        id: 'dash-1',
        title: 'My Dashboard',
        description: 'Dashboard description',
        tags: ['tag-1', 'tag-2'],
      });

      expect(core.http.put).toHaveBeenCalledWith('/api/saved_objects/dashboard/dash-1', {
        body: JSON.stringify({
          attributes: { title: 'My Dashboard', description: 'Dashboard description' },
          references: [
            { type: 'index-pattern', id: 'ip-1', name: 'index-pattern-1' },
            { type: 'visualization', id: 'vis-1', name: 'visualization-1' },
            { type: 'tag', id: 'tag-1', name: 'tag-tag-1' },
            { type: 'tag', id: 'tag-2', name: 'tag-tag-2' },
          ],
        }),
      });
    });

    it('should handle objects with no existing references', async () => {
      const core = createMockCore();
      (core.http.get as jest.Mock).mockResolvedValue({
        // No references property.
      });
      (core.http.put as jest.Mock).mockResolvedValue({});

      const onSave = createDefaultOnSave(core, 'visualization');

      await onSave?.({
        id: 'vis-1',
        title: 'My Vis',
        description: '',
        tags: ['tag-1'],
      });

      expect(core.http.put).toHaveBeenCalledWith('/api/saved_objects/visualization/vis-1', {
        body: JSON.stringify({
          attributes: { title: 'My Vis', description: '' },
          references: [{ type: 'tag', id: 'tag-1', name: 'tag-tag-1' }],
        }),
      });
    });

    it('should handle empty tags array', async () => {
      const core = createMockCore();
      (core.http.get as jest.Mock).mockResolvedValue({
        references: [{ type: 'index-pattern', id: 'ip-1', name: 'index-pattern-1' }],
      });
      (core.http.put as jest.Mock).mockResolvedValue({});

      const onSave = createDefaultOnSave(core, 'dashboard');

      await onSave?.({
        id: 'dash-1',
        title: 'No Tags Dashboard',
        description: '',
        tags: [],
      });

      expect(core.http.put).toHaveBeenCalledWith('/api/saved_objects/dashboard/dash-1', {
        body: JSON.stringify({
          attributes: { title: 'No Tags Dashboard', description: '' },
          references: [{ type: 'index-pattern', id: 'ip-1', name: 'index-pattern-1' }],
        }),
      });
    });
  });

  describe('createActivityAppendRows', () => {
    it('should return a function that renders DefaultActivityRows', () => {
      const mockContentInsightsClient = {} as ContentInsightsClientPublic;
      const appendRows = createActivityAppendRows(mockContentInsightsClient, 'dashboards');

      expect(typeof appendRows).toBe('function');
    });

    it('should render activity rows with item and entityNamePlural', () => {
      const mockContentInsightsClient = {} as ContentInsightsClientPublic;
      const appendRows = createActivityAppendRows(mockContentInsightsClient, 'dashboards');

      const mockItem: ContentListItem = {
        id: 'item-1',
        title: 'Test Item',
        type: 'dashboard',
      };

      const { getByTestId } = render(<>{appendRows?.(mockItem)}</>);

      expect(getByTestId('mock-activity-rows')).toHaveTextContent(
        'Activity for item-1 (dashboards)'
      );
    });
  });

  describe('resolveContentEditorConfig', () => {
    const createMockDeps = (): ResolveContentEditorDeps => ({
      core: {
        http: {
          get: jest.fn(),
          put: jest.fn(),
        },
      } as unknown as CoreStart,
      savedObjectType: 'dashboard',
      entityNamePlural: 'dashboards',
    });

    it('should return undefined when config is undefined', () => {
      const deps = createMockDeps();
      const result = resolveContentEditorConfig(undefined, deps);

      expect(result).toBeUndefined();
    });

    it('should return undefined when config is false', () => {
      const deps = createMockDeps();
      const result = resolveContentEditorConfig(false, deps);

      expect(result).toBeUndefined();
    });

    it('should create default config when config is true', () => {
      const deps = createMockDeps();
      const result = resolveContentEditorConfig(true, deps);

      expect(result).toBeDefined();
      expect(typeof result?.onSave).toBe('function');
    });

    it('should use provided onSave when config has one', () => {
      const deps = createMockDeps();
      const customOnSave = jest.fn();
      const config: ContentEditorConfig = { onSave: customOnSave };

      const result = resolveContentEditorConfig(config, deps);

      expect(result?.onSave).toBe(customOnSave);
    });

    it('should use default onSave when config object has no onSave', () => {
      const deps = createMockDeps();
      const config: ContentEditorConfig = {
        // No onSave provided.
      };

      const result = resolveContentEditorConfig(config, deps);

      expect(result?.onSave).toBeDefined();
      expect(typeof result?.onSave).toBe('function');
    });

    it('should preserve other config properties', () => {
      const deps = createMockDeps();
      const customAppendRows = jest.fn();
      const config: ContentEditorConfig = {
        appendRows: customAppendRows,
      };

      const result = resolveContentEditorConfig(config, deps);

      expect(result?.appendRows).toBe(customAppendRows);
      expect(result?.onSave).toBeDefined(); // Default onSave added.
    });
  });
});
