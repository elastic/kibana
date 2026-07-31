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

    it('renders array items as bare values, without indices', () => {
      renderWithI18n(<JsonTreeViewer json={['alpha', 'beta']} />);

      expect(screen.getByText('"alpha"')).toBeVisible();
      expect(screen.getByText('"beta"')).toBeVisible();
      expect(screen.queryByText('0')).not.toBeInTheDocument();
      expect(screen.queryByText('1')).not.toBeInTheDocument();
    });

    it('renders a primitive JSON value under the key "value"', () => {
      renderWithI18n(<JsonTreeViewer json={42} />);

      expect(screen.getByText('value')).toBeVisible();
      expect(screen.getByText('42')).toBeVisible();
    });

    it('renders the field count on a collapsed object', () => {
      const json = { user: { name: 'Bob', age: 25 } };
      renderWithI18n(<JsonTreeViewer json={json} />);

      expect(screen.getByText('2 fields')).toBeVisible();
    });

    it('renders the item count on a collapsed array', () => {
      const json = { tags: ['a', 'b', 'c'] };
      renderWithI18n(<JsonTreeViewer json={json} />);

      expect(screen.getByText('3 items')).toBeVisible();
    });

    it('separates fields with a comma but omits it after the last field', () => {
      renderWithI18n(<JsonTreeViewer json={{ a: 1, b: 2 }} />);

      expect(screen.getAllByText(',')).toHaveLength(1);
    });

    it('renders an empty object as {}', () => {
      renderWithI18n(<JsonTreeViewer json={{ meta: {} }} />);

      expect(screen.getByText('{}')).toBeVisible();
    });

    it('renders a closing bracket node only after a collection is expanded', async () => {
      renderWithI18n(<JsonTreeViewer json={{ user: { name: 'Bob' } }} />);

      expect(document.querySelectorAll('[data-test-subj="jsonTreeClosingBracket"]')).toHaveLength(
        0
      );

      await userEvent.click(screen.getByRole('button', { name: 'Expand all' }));

      expect(document.querySelectorAll('[data-test-subj="jsonTreeClosingBracket"]')).toHaveLength(
        1
      );
    });

    it('toggles a single Expand all / Collapse all control', async () => {
      renderWithI18n(<JsonTreeViewer json={{ user: { name: 'Bob' } }} />);

      expect(screen.getByRole('button', { name: 'Expand all' })).toBeVisible();
      expect(screen.queryByRole('button', { name: 'Collapse all' })).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: 'Expand all' }));

      expect(screen.getByRole('button', { name: 'Collapse all' })).toBeVisible();
      expect(screen.queryByRole('button', { name: 'Expand all' })).not.toBeInTheDocument();
    });

    it('renders a per-value copy button for each leaf value', () => {
      renderWithI18n(<JsonTreeViewer json={SMALL_OBJECT} />);

      expect(screen.getAllByRole('button', { name: 'Copy value' })).toHaveLength(4);
    });

    it('reflects a manual node toggle in the Expand all / Collapse all control', async () => {
      renderWithI18n(<JsonTreeViewer json={{ user: { name: 'Bob' } }} />);

      expect(screen.getByRole('button', { name: 'Expand all' })).toBeVisible();

      // Expanding the only collection by hand should flip the toggle, proving individual
      // toggles are tracked (not just the bulk Expand all / Collapse all actions).
      await userEvent.click(screen.getByText('user'));

      expect(screen.getByRole('button', { name: 'Collapse all' })).toBeVisible();
    });

    it('hides the expand/collapse controls when there are no nested collections', () => {
      renderWithI18n(<JsonTreeViewer json={SMALL_OBJECT} />);

      expect(screen.queryByRole('button', { name: 'Expand all' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Collapse all' })).not.toBeInTheDocument();
    });
  });

  describe('visibility pagination', () => {
    it('shows only the first 10 fields initially for a large object', () => {
      renderWithI18n(<JsonTreeViewer json={LARGE_OBJECT} />);

      expect(screen.getByText('field_1')).toBeVisible();
      expect(screen.getByText('field_10')).toBeVisible();
      expect(screen.queryByText('field_11')).not.toBeInTheDocument();
    });

    it('shows "Show N more fields" and "Show all fields" buttons when items are hidden', () => {
      renderWithI18n(<JsonTreeViewer json={LARGE_OBJECT} />);

      expect(screen.getByRole('button', { name: 'Show 10 more fields' })).toBeVisible();
      expect(screen.getByRole('button', { name: 'Show all fields' })).toBeVisible();
    });

    it('reveals the next 10 fields when "Show more" is clicked', async () => {
      renderWithI18n(<JsonTreeViewer json={LARGE_OBJECT} />);

      await userEvent.click(screen.getByRole('button', { name: 'Show 10 more fields' }));

      expect(screen.getByText('field_11')).toBeVisible();
      expect(screen.getByText('field_20')).toBeVisible();
    });

    it('shows all fields when "Show all fields" is clicked', async () => {
      renderWithI18n(<JsonTreeViewer json={LARGE_OBJECT} />);

      await userEvent.click(screen.getByRole('button', { name: 'Show all fields' }));

      expect(screen.getByText('field_20')).toBeVisible();
      expect(screen.queryByRole('button', { name: /Show \d+ more field/ })).not.toBeInTheDocument();
    });

    it('shows the "Show fewer fields" button once more than the initial fields are visible', async () => {
      renderWithI18n(<JsonTreeViewer json={LARGE_OBJECT} />);

      await userEvent.click(screen.getByRole('button', { name: 'Show 10 more fields' }));

      expect(screen.getByRole('button', { name: 'Show fewer fields' })).toBeVisible();
    });

    it('returns to the initial fields when "Show fewer fields" is clicked', async () => {
      renderWithI18n(<JsonTreeViewer json={LARGE_OBJECT} />);

      await userEvent.click(screen.getByRole('button', { name: 'Show all fields' }));
      await userEvent.click(screen.getByRole('button', { name: 'Show fewer fields' }));

      expect(screen.getByText('field_10')).toBeVisible();
      expect(screen.queryByText('field_11')).not.toBeInTheDocument();
    });

    it('does not show pagination controls when all fields fit within the initial limit', () => {
      renderWithI18n(<JsonTreeViewer json={SMALL_OBJECT} />);

      expect(screen.queryByRole('button', { name: /Show/ })).not.toBeInTheDocument();
    });

    it('shows the correct "Show N more fields" singular form when only one field remains', async () => {
      const json = Object.fromEntries(Array.from({ length: 11 }, (_, i) => [`f${i}`, i]));
      renderWithI18n(<JsonTreeViewer json={json} />);

      expect(screen.getByRole('button', { name: 'Show 1 more field' })).toBeVisible();
    });
  });
});
