/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { FieldIcon, typeToEuiIconMap } from './field_icon';
import { render, screen } from '@testing-library/react';

const availableTypes = Object.keys(typeToEuiIconMap);

const getFieldIcon = (title: string) => screen.getByText(title);

const getFieldIconToken = (title: string) => getFieldIcon(title).closest('.kbnFieldIcon');

describe('FieldIcon', () => {
  describe('FieldIcon renders known field types', () => {
    it.each(availableTypes)('%s is rendered', (type) => {
      const expected = typeToEuiIconMap[type as keyof typeof typeToEuiIconMap];

      render(<FieldIcon type={type} />);

      const icon = getFieldIcon(type);
      expect(icon).toBeVisible();
      expect(icon).toHaveAttribute('data-euiicon-type', expected.iconType);

      const token = getFieldIconToken(type);
      expect(token).toBeVisible();
    });
  });

  it('FieldIcon renders an icon for an unknown type', () => {
    render(<FieldIcon label="test" type="sdfsdf" />);

    const icon = getFieldIcon('test');
    expect(icon).toBeVisible();
    expect(icon).toHaveAttribute('data-euiicon-type', 'question');
    expect(getFieldIconToken('test')).toBeVisible();
  });

  it('FieldIcon supports same props as EuiToken', () => {
    render(
      <FieldIcon
        color="euiColorVis0"
        fill="none"
        label="test"
        shape="circle"
        size="l"
        type="number"
      />
    );

    const icon = getFieldIcon('test');
    expect(icon).toHaveAttribute('data-euiicon-type', 'tokenNumber');

    const token = getFieldIconToken('test');
    expect(token?.className).toMatch(/euiToken-circle-none-l/);
    expect(token?.className).toContain('euiColorVis0');
  });

  it('FieldIcon changes fill when scripted is true', () => {
    render(<FieldIcon label="test" scripted={true} type="number" />);

    expect(getFieldIcon('test')).toBeVisible();
    expect(getFieldIconToken('test')?.className).toMatch(/euiToken-square-dark-s/);
  });

  it('FieldIcon renders with className if provided', () => {
    render(<FieldIcon className="myClass" label="test" type="sdfsdf" />);

    const token = getFieldIconToken('test');
    expect(token).toHaveClass('kbnFieldIcon', 'myClass');
  });
});
