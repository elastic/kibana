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
import { EMPTY_LABEL, NULL_LABEL, MISSING_TOKEN } from '@kbn/field-formats-common';
import { EmptyValue, checkForMissingValueReact, EMPTY_VALUE_CLASS } from './empty_value';

describe('EmptyValue', () => {
  it('renders empty string label for empty string value', () => {
    const { container } = render(<EmptyValue value="" />);

    expect(container.textContent).toBe(EMPTY_LABEL);
    expect(container.querySelector(`.${EMPTY_VALUE_CLASS}`)).not.toBeNull();
  });

  it('renders null label for null value', () => {
    const { container } = render(<EmptyValue value={null} />);

    expect(container.textContent).toBe(NULL_LABEL);
    expect(container.querySelector(`.${EMPTY_VALUE_CLASS}`)).not.toBeNull();
  });

  it('renders null label for undefined value', () => {
    const { container } = render(<EmptyValue value={undefined} />);

    expect(container.textContent).toBe(NULL_LABEL);
    expect(container.querySelector(`.${EMPTY_VALUE_CLASS}`)).not.toBeNull();
  });

  it('renders null label for MISSING_TOKEN value', () => {
    const { container } = render(<EmptyValue value={MISSING_TOKEN} />);

    expect(container.textContent).toBe(NULL_LABEL);
    expect(container.querySelector(`.${EMPTY_VALUE_CLASS}`)).not.toBeNull();
  });

  it('renders nothing for non-empty values', () => {
    const { container } = render(<EmptyValue value="some value" />);

    expect(container.textContent).toBe('');
  });

  it('renders nothing for zero', () => {
    const { container } = render(<EmptyValue value={0} />);

    expect(container.textContent).toBe('');
  });

  it('renders nothing for false', () => {
    const { container } = render(<EmptyValue value={false} />);

    expect(container.textContent).toBe('');
  });
});

describe('checkForMissingValueReact', () => {
  it('returns element for empty string', () => {
    const result = checkForMissingValueReact('');

    expect(result).toBeDefined();
    const { container } = render(<>{result}</>);
    expect(container.textContent).toBe(EMPTY_LABEL);
    expect(container.querySelector(`.${EMPTY_VALUE_CLASS}`)).not.toBeNull();
  });

  it('returns element for null', () => {
    const result = checkForMissingValueReact(null);

    expect(result).toBeDefined();
    const { container } = render(<>{result}</>);
    expect(container.textContent).toBe(NULL_LABEL);
    expect(container.querySelector(`.${EMPTY_VALUE_CLASS}`)).not.toBeNull();
  });

  it('returns element for undefined', () => {
    const result = checkForMissingValueReact(undefined);

    expect(result).toBeDefined();
    const { container } = render(<>{result}</>);
    expect(container.textContent).toBe(NULL_LABEL);
    expect(container.querySelector(`.${EMPTY_VALUE_CLASS}`)).not.toBeNull();
  });

  it('returns element for MISSING_TOKEN', () => {
    const result = checkForMissingValueReact(MISSING_TOKEN);

    expect(result).toBeDefined();
    const { container } = render(<>{result}</>);
    expect(container.textContent).toBe(NULL_LABEL);
  });

  it('returns undefined for non-empty values', () => {
    expect(checkForMissingValueReact('value')).toBeUndefined();
    expect(checkForMissingValueReact(0)).toBeUndefined();
    expect(checkForMissingValueReact(false)).toBeUndefined();
    expect(checkForMissingValueReact([])).toBeUndefined();
    expect(checkForMissingValueReact({})).toBeUndefined();
  });
});
