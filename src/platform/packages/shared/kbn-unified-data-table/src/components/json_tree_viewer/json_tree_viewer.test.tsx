/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { JsonTreeViewer } from './json_tree_viewer';

const SMALL_OBJECT = { name: 'Alice', age: 30, active: true, score: null };

const LARGE_OBJECT = Object.fromEntries(
  Array.from({ length: 20 }, (_, i) => [`field_${i + 1}`, i + 1])
);

describe('JsonTreeViewer', () => {
  describe('rendering', () => {
    it('renders field names and values for a simple object', () => {
      renderWithI18n(<JsonTreeViewer json={SMALL_OBJECT} />);

      expect(screen.getByText('name')).toBeVisible();
      expect(screen.getByText('"Alice"')).toBeVisible();
      expect(screen.getByText('age')).toBeVisible();
      expect(screen.getByText('30')).toBeVisible();
      expect(screen.getByText('active')).toBeVisible();
      expect(screen.getByText('true')).toBeVisible();
      expect(screen.getByText('score')).toBeVisible();
      expect(screen.getByText('null')).toBeVisible();
    });

    it('wraps an object in curly braces', () => {
      renderWithI18n(<JsonTreeViewer json={{ a: 1 }} />);

      expect(screen.getByText('{')).toBeVisible();
      expect(screen.getByText('}')).toBeVisible();
    });

    it('wraps an array in square brackets', () => {
      renderWithI18n(<JsonTreeViewer json={[1, 2, 3]} />);

      expect(screen.getByText('[')).toBeVisible();
      expect(screen.getByText(']')).toBeVisible();
    });

    it('renders array indices as field names', () => {
      renderWithI18n(<JsonTreeViewer json={['alpha', 'beta']} />);

      expect(screen.getByText('0')).toBeVisible();
      expect(screen.getByText('"alpha"')).toBeVisible();
      expect(screen.getByText('1')).toBeVisible();
      expect(screen.getByText('"beta"')).toBeVisible();
    });

    it('renders a primitive JSON value under the key "value"', () => {
      renderWithI18n(<JsonTreeViewer json={42} />);

      expect(screen.getByText('value')).toBeVisible();
      expect(screen.getByText('42')).toBeVisible();
    });

    it('renders nested objects with child count in the label title', () => {
      const json = { user: { name: 'Bob', age: 25 } };
      renderWithI18n(<JsonTreeViewer json={json} />);

      const userLabel = screen.getByTitle('2 fields');
      expect(userLabel).toBeVisible();
    });

    it('renders nested arrays with item count in the label title', () => {
      const json = { tags: ['a', 'b', 'c'] };
      renderWithI18n(<JsonTreeViewer json={json} />);

      const tagsLabel = screen.getByTitle('3 items');
      expect(tagsLabel).toBeVisible();
    });

    it('shows the Expand visible and Collapse visible buttons', () => {
      renderWithI18n(<JsonTreeViewer json={SMALL_OBJECT} />);

      expect(screen.getByRole('button', { name: 'Expand visible' })).toBeVisible();
      expect(screen.getByRole('button', { name: 'Collapse visible' })).toBeVisible();
    });
  });

  describe('visibility pagination', () => {
    it('shows only the first 10 fields initially for a large object', () => {
      renderWithI18n(<JsonTreeViewer json={LARGE_OBJECT} />);

      expect(screen.getByText('field_1')).toBeVisible();
      expect(screen.getByText('field_10')).toBeVisible();
      expect(screen.queryByText('field_11')).not.toBeInTheDocument();
    });

    it('shows "Show N more fields" and "Show full object" buttons when items are hidden', () => {
      renderWithI18n(<JsonTreeViewer json={LARGE_OBJECT} />);

      expect(screen.getByRole('button', { name: 'Show 10 more fields' })).toBeVisible();
      expect(screen.getByRole('button', { name: 'Show full object' })).toBeVisible();
    });

    it('reveals the next 10 fields when "Show more" is clicked', async () => {
      renderWithI18n(<JsonTreeViewer json={LARGE_OBJECT} />);

      await userEvent.click(screen.getByRole('button', { name: 'Show 10 more fields' }));

      expect(screen.getByText('field_11')).toBeVisible();
      expect(screen.getByText('field_20')).toBeVisible();
    });

    it('shows all fields when "Show full object" is clicked', async () => {
      renderWithI18n(<JsonTreeViewer json={LARGE_OBJECT} />);

      await userEvent.click(screen.getByRole('button', { name: 'Show full object' }));

      expect(screen.getByText('field_20')).toBeVisible();
      expect(screen.queryByRole('button', { name: /Show \d+ more field/ })).not.toBeInTheDocument();
    });

    it('shows "Hide all rows" button when more than the minimum number of fields are visible', async () => {
      renderWithI18n(<JsonTreeViewer json={LARGE_OBJECT} />);

      await userEvent.click(screen.getByRole('button', { name: 'Show 10 more fields' }));

      expect(screen.getByRole('button', { name: 'Hide all rows' })).toBeVisible();
    });

    it('hides back to the minimum when "Hide all rows" is clicked', async () => {
      renderWithI18n(<JsonTreeViewer json={LARGE_OBJECT} />);

      await userEvent.click(screen.getByRole('button', { name: 'Show full object' }));
      await userEvent.click(screen.getByRole('button', { name: 'Hide all rows' }));

      expect(screen.getByText('field_5')).toBeVisible();
      expect(screen.queryByText('field_6')).not.toBeInTheDocument();
    });

    it('does not show pagination controls when all fields fit within the initial limit', () => {
      renderWithI18n(<JsonTreeViewer json={SMALL_OBJECT} />);

      expect(screen.queryByRole('button', { name: /Show/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Hide all rows' })).not.toBeInTheDocument();
    });

    it('shows the correct "Show N more fields" singular form when only one field remains', async () => {
      const json = Object.fromEntries(Array.from({ length: 11 }, (_, i) => [`f${i}`, i]));
      renderWithI18n(<JsonTreeViewer json={json} />);

      expect(screen.getByRole('button', { name: 'Show 1 more field' })).toBeVisible();
    });
  });
});
