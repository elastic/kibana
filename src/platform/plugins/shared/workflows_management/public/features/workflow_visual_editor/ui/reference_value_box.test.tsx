/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { ReferenceValueBox } from './reference_value_box';
import { insertIntoActiveDataReferenceTarget } from '../../../shared/lib/active_data_reference_insert_target';
import { TestProvider } from '../../../shared/mocks/test_providers';
import type { DataReferenceCatalog } from '../lib/build_data_reference_catalog';
import type { ReferenceForm } from '../lib/reference_value';

const catalog: DataReferenceCatalog = {
  groups: [
    {
      id: 'context',
      title: 'Workflow context',
      description: '',
      items: [
        {
          path: 'consts.tags',
          label: 'tags',
          typeLabel: 'string[]',
          drillable: false,
          originLabel: 'Workflow context',
        },
        {
          path: 'consts.name',
          label: 'name',
          typeLabel: 'string',
          drillable: false,
          originLabel: 'Workflow context',
        },
      ],
    },
  ],
};

const TEST_ID = 'box';

const renderBox = (
  value: unknown,
  props: Partial<React.ComponentProps<typeof ReferenceValueBox>> & { form?: ReferenceForm } = {}
) => {
  const onChange = jest.fn();
  const onBlur = jest.fn();
  const view = render(
    <ReferenceValueBox
      catalog={catalog}
      value={value}
      form="value"
      onChange={onChange}
      onBlur={onBlur}
      ariaLabel="Index"
      data-test-subj={TEST_ID}
      {...props}
    />,
    { wrapper: TestProvider }
  );
  return { onChange, onBlur, ...view };
};

describe('ReferenceValueBox', () => {
  describe('what the box shows', () => {
    it('asks to select data while there is no value, with nothing to clear', () => {
      renderBox(undefined);
      expect(screen.getByText('Select data from an earlier step')).toBeInTheDocument();
      expect(screen.queryByTestId(`${TEST_ID}-clear`)).not.toBeInTheDocument();
    });

    it('does not show a typed value that was kept while the switch sits on Data', () => {
      renderBox('abc');
      expect(screen.getByText('Select data from an earlier step')).toBeInTheDocument();
      expect(screen.queryByText('abc')).not.toBeInTheDocument();
      expect(screen.queryByTestId(`${TEST_ID}-clear`)).not.toBeInTheDocument();
    });

    it('shows a whole reference as a chip carrying its catalog type', () => {
      renderBox('${{ consts.tags }}');
      const chip = screen.getByTestId(`${TEST_ID}-chip`);
      expect(chip).toHaveAccessibleName('Reference consts.tags, string[]');
      expect(chip).toHaveAttribute('data-tone', 'neutral');
      expect(screen.getByTestId(`${TEST_ID}-clear`)).toBeInTheDocument();
    });

    it('shows a reference the catalog does not know with an unknown type', () => {
      renderBox('${{ steps.other.output }}');
      expect(screen.getByTestId(`${TEST_ID}-chip`)).toHaveAccessibleName(
        'Reference steps.other.output, unknown'
      );
    });

    it('shows a Liquid tag, which is not one whole reference, as typed', () => {
      renderBox('{% if consts.name %}x{% endif %}');
      expect(screen.getByTestId(`${TEST_ID}-expression`)).toHaveTextContent(
        '{% if consts.name %}x{% endif %}'
      );
      expect(screen.queryByTestId(`${TEST_ID}-chip`)).not.toBeInTheDocument();
      expect(screen.getByTestId(`${TEST_ID}-clear`)).toBeInTheDocument();
    });
  });

  describe('keeping the type', () => {
    it('flags a text-form reference in a value-form box and fixes it in one click', () => {
      const { onChange } = renderBox('{{ consts.name }}', { form: 'value' });
      expect(screen.getByTestId(`${TEST_ID}-chip`)).toHaveAttribute('data-tone', 'warning');
      expect(screen.getByTestId(`${TEST_ID}-keepTypeHint`)).toBeInTheDocument();

      fireEvent.click(screen.getByTestId(`${TEST_ID}-keepType`));
      expect(onChange).toHaveBeenCalledWith('${{ consts.name }}');
    });

    it('does not flag a value-form reference', () => {
      renderBox('${{ consts.name }}', { form: 'value' });
      expect(screen.queryByTestId(`${TEST_ID}-keepTypeHint`)).not.toBeInTheDocument();
    });

    it('does not flag a text-form reference in a text-form box', () => {
      renderBox('{{ consts.name }}', { form: 'text' });
      expect(screen.getByTestId(`${TEST_ID}-chip`)).toHaveAttribute('data-tone', 'neutral');
      expect(screen.queryByTestId(`${TEST_ID}-keepTypeHint`)).not.toBeInTheDocument();
    });

    describe('where one string is a valid value too (containers only)', () => {
      it('does not flag a reference known to be one value', () => {
        renderBox('{{ consts.name }}', { keepTypeFor: 'containers' });
        expect(screen.queryByTestId(`${TEST_ID}-keepTypeHint`)).not.toBeInTheDocument();
      });

      it('flags a reference known to be a list', () => {
        renderBox('{{ consts.tags }}', { keepTypeFor: 'containers' });
        expect(screen.getByTestId(`${TEST_ID}-keepTypeHint`)).toBeInTheDocument();
      });

      it('does not flag a reference of unknown type', () => {
        renderBox('{{ steps.other.output }}', { keepTypeFor: 'containers' });
        expect(screen.queryByTestId(`${TEST_ID}-keepTypeHint`)).not.toBeInTheDocument();
      });
    });
  });

  describe('controls', () => {
    it('clears the reference', () => {
      const { onChange } = renderBox('${{ consts.tags }}');
      fireEvent.click(screen.getByTestId(`${TEST_ID}-clear`));
      expect(onChange).toHaveBeenCalledWith(undefined);
    });

    it('offers the expanded editor only when asked to', () => {
      const { unmount } = renderBox('${{ consts.tags }}');
      expect(screen.queryByTestId(`${TEST_ID}-expand`)).not.toBeInTheDocument();
      unmount();

      const onExpand = jest.fn();
      renderBox('${{ consts.tags }}', { onExpand });
      fireEvent.click(screen.getByTestId(`${TEST_ID}-expand`));
      expect(onExpand).toHaveBeenCalledTimes(1);
    });

    it('opens and closes the picker from its button', async () => {
      renderBox(undefined);
      const pick = screen.getByTestId(`${TEST_ID}-pick`);
      expect(pick).toHaveAttribute('aria-pressed', 'false');
      await act(async () => {
        fireEvent.click(pick);
      });
      expect(pick).toHaveAttribute('aria-pressed', 'true');
      await act(async () => {
        fireEvent.click(pick);
      });
      expect(pick).toHaveAttribute('aria-pressed', 'false');
    });

    it('opens the picker from the chip', async () => {
      renderBox('${{ consts.tags }}');
      await act(async () => {
        fireEvent.click(screen.getByTestId(`${TEST_ID}-chip`));
      });
      expect(screen.getByTestId(`${TEST_ID}-pick`)).toHaveAttribute('aria-pressed', 'true');
    });

    it('reports blur', () => {
      const { onBlur } = renderBox(undefined);
      fireEvent.blur(screen.getByTestId(TEST_ID));
      expect(onBlur).toHaveBeenCalled();
    });
  });

  describe('click-to-insert from the execution flyout', () => {
    it('writes a picked reference in the form the box holds, once the box was focused', () => {
      const { onChange } = renderBox(undefined, { form: 'value' });
      fireEvent.focus(screen.getByTestId(`${TEST_ID}-pick`));
      expect(insertIntoActiveDataReferenceTarget('{{ consts.tags }}')).toBe(true);
      expect(onChange).toHaveBeenCalledWith('${{ consts.tags }}');
    });

    it('writes the text form in a text-form box', () => {
      const { onChange } = renderBox(undefined, { form: 'text' });
      fireEvent.focus(screen.getByTestId(`${TEST_ID}-pick`));
      insertIntoActiveDataReferenceTarget('${{ consts.tags }}');
      expect(onChange).toHaveBeenCalledWith('{{ consts.tags }}');
    });

    it('is no longer a target once the box unmounts', () => {
      const { unmount } = renderBox(undefined);
      fireEvent.focus(screen.getByTestId(`${TEST_ID}-pick`));
      unmount();
      expect(insertIntoActiveDataReferenceTarget('{{ consts.tags }}')).toBe(false);
    });
  });
});
