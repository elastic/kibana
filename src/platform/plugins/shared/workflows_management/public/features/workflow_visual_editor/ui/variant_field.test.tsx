/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { z } from '@kbn/zod/v4';
import { VariantField } from './variant_field';
import { TestProvider } from '../../../shared/mocks/test_providers';
import type { FormVariant, StepFormField } from '../lib/step_form_schema';

const TEST_ID = 'variants';

const scalarVariant: FormVariant = {
  id: 'variant-0',
  label: 'Number',
  kind: 'scalar',
  schema: z.number(),
  fields: [{ key: 'value', path: ['max'], label: 'Value', required: false, kind: 'number' }],
};

const objectVariant: FormVariant = {
  id: 'variant-1',
  label: 'Limit + behavior',
  kind: 'object',
  schema: z.object({ limit: z.number(), 'on-limit': z.string().optional() }),
  fields: [
    { key: 'limit', path: ['max', 'limit'], label: 'Limit', required: true, kind: 'number' },
    {
      key: 'on-limit',
      path: ['max', 'on-limit'],
      label: 'On limit',
      required: false,
      kind: 'text',
    },
  ],
};

const hostVariant: FormVariant = {
  id: 'variant-0',
  label: 'host',
  kind: 'object',
  schema: z.object({ type: z.literal('host'), name: z.string() }),
  fields: [{ key: 'name', path: ['target', 'name'], label: 'Name', required: true, kind: 'text' }],
  discriminator: { key: 'type', value: 'host' },
};

const siteVariant: FormVariant = {
  id: 'variant-1',
  label: 'site',
  kind: 'object',
  schema: z.object({ type: z.literal('site'), url: z.string() }),
  fields: [{ key: 'url', path: ['target', 'url'], label: 'Url', required: true, kind: 'text' }],
  discriminator: { key: 'type', value: 'site' },
};

const fieldOf = (variants: readonly FormVariant[]): StepFormField => ({
  key: 'max',
  path: ['max'],
  label: 'Max',
  required: false,
  kind: 'variants',
  variants,
});

const renderVariantField = (variants: readonly FormVariant[], value: unknown) => {
  const onChange = jest.fn();
  const renderField = jest.fn((field: StepFormField) => (
    <span data-test-subj={`rendered-${field.key}`} />
  ));
  const view = render(
    <VariantField
      field={fieldOf(variants)}
      value={value}
      onChange={onChange}
      renderField={renderField}
      label="Max"
      data-test-subj={TEST_ID}
    />,
    { wrapper: TestProvider }
  );
  const rerender = (nextValue: unknown) =>
    view.rerender(
      <VariantField
        field={fieldOf(variants)}
        value={nextValue}
        onChange={onChange}
        renderField={renderField}
        label="Max"
        data-test-subj={TEST_ID}
      />
    );
  return { onChange, renderField, rerender };
};

const isActive = (name: string) =>
  screen.getByRole('button', { name }).getAttribute('aria-pressed') === 'true';

const pickVariant = (id: string) => fireEvent.click(screen.getByTestId(`${TEST_ID}-variant-${id}`));

describe('VariantField', () => {
  describe('which way is active', () => {
    it('is the first variant while there is no value', () => {
      renderVariantField([scalarVariant, objectVariant], undefined);
      expect(isActive('Number')).toBe(true);
      expect(screen.getByTestId('rendered-value')).toBeInTheDocument();
      expect(screen.queryByTestId('rendered-limit')).not.toBeInTheDocument();
    });

    it('is inferred from the stored value', () => {
      renderVariantField([scalarVariant, objectVariant], { limit: 3 });
      expect(isActive('Limit + behavior')).toBe(true);
      expect(screen.getByTestId('rendered-limit')).toBeInTheDocument();
      expect(screen.getByTestId('rendered-on-limit')).toBeInTheDocument();
    });

    it('follows a stored value that changes from outside', () => {
      const { rerender } = renderVariantField([scalarVariant, objectVariant], 5);
      expect(isActive('Number')).toBe(true);
      rerender({ limit: 3 });
      expect(isActive('Limit + behavior')).toBe(true);
    });
  });

  describe('switching with no value', () => {
    it('changes the way without writing anything when the target has no discriminator', () => {
      const { onChange } = renderVariantField([scalarVariant, objectVariant], undefined);
      pickVariant('variant-1');
      expect(onChange).not.toHaveBeenCalled();
      expect(isActive('Limit + behavior')).toBe(true);
      expect(screen.getByTestId('rendered-limit')).toBeInTheDocument();
    });

    it('writes the discriminator of the chosen way, so the value says which way it is', () => {
      const { onChange } = renderVariantField([hostVariant, siteVariant], undefined);
      pickVariant('variant-1');
      expect(onChange).toHaveBeenCalledWith({ type: 'site' });
      expect(screen.getByTestId('rendered-url')).toBeInTheDocument();
    });

    it('treats a value that is only a discriminator as not filled in yet', () => {
      const { onChange } = renderVariantField([hostVariant, siteVariant], { type: 'host' });
      pickVariant('variant-1');
      expect(screen.queryByTestId(`${TEST_ID}-confirm`)).not.toBeInTheDocument();
      expect(onChange).toHaveBeenCalledWith({ type: 'site' });
    });
  });

  describe('switching away from a value', () => {
    it('asks before replacing it, and writes nothing until confirmed', () => {
      const { onChange } = renderVariantField([scalarVariant, objectVariant], 5);
      pickVariant('variant-1');
      expect(screen.getByTestId(`${TEST_ID}-confirm`)).toBeInTheDocument();
      expect(
        screen.getByText(
          'Max is currently written as "Number". Switching to "Limit + behavior" replaces it.'
        )
      ).toBeInTheDocument();
      expect(onChange).not.toHaveBeenCalled();
    });

    it('keeps the value and the way on Cancel', () => {
      const { onChange } = renderVariantField([scalarVariant, objectVariant], 5);
      pickVariant('variant-1');
      fireEvent.click(screen.getByText('Cancel'));
      expect(screen.queryByTestId(`${TEST_ID}-confirm`)).not.toBeInTheDocument();
      expect(onChange).not.toHaveBeenCalled();
      expect(isActive('Number')).toBe(true);
    });

    it('replaces the value with the blank of the chosen way on Switch', () => {
      const { onChange } = renderVariantField([scalarVariant, objectVariant], 5);
      pickVariant('variant-1');
      fireEvent.click(screen.getByText('Switch'));
      expect(onChange).toHaveBeenCalledWith({});
      expect(isActive('Limit + behavior')).toBe(true);
    });

    it('starts a switch to a scalar way from nothing', () => {
      const { onChange } = renderVariantField([scalarVariant, objectVariant], { limit: 3 });
      pickVariant('variant-0');
      fireEvent.click(screen.getByText('Switch'));
      expect(onChange).toHaveBeenCalledWith(undefined);
    });

    it('does nothing when the active way is picked again', () => {
      const { onChange } = renderVariantField([scalarVariant, objectVariant], 5);
      pickVariant('variant-0');
      expect(screen.queryByTestId(`${TEST_ID}-confirm`)).not.toBeInTheDocument();
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('rendering the chosen way', () => {
    it('renders each field of an object way, marking the optional ones', () => {
      const { renderField } = renderVariantField([scalarVariant, objectVariant], { limit: 3 });
      expect(renderField).toHaveBeenCalledWith(objectVariant.fields[0], {
        showOptionalMarker: false,
      });
      expect(renderField).toHaveBeenCalledWith(objectVariant.fields[1], {
        showOptionalMarker: true,
      });
    });

    it('does not mark the one control of a scalar way as optional', () => {
      const { renderField } = renderVariantField([scalarVariant, objectVariant], 5);
      expect(renderField).toHaveBeenCalledWith(scalarVariant.fields[0], {
        showOptionalMarker: false,
      });
    });
  });

  describe('the selector', () => {
    it('is a button group up to three ways', () => {
      renderVariantField([scalarVariant, objectVariant], undefined);
      expect(screen.getByTestId(`${TEST_ID}-variants`)).toBeInTheDocument();
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });

    it('is a select from four ways', () => {
      const extra = (n: number): FormVariant => ({
        ...objectVariant,
        id: `variant-${n}`,
        label: `Way ${n}`,
      });
      renderVariantField([scalarVariant, objectVariant, extra(2), extra(3)], undefined);
      expect(screen.getByRole('combobox', { name: 'Way to write Max' })).toBeInTheDocument();
    });
  });
});
