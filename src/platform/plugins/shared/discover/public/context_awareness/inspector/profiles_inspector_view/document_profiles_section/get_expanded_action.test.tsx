/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MouseEvent } from 'react';
import { getExpandAction } from './get_expand_action';

const setup = (params: Partial<Parameters<typeof getExpandAction>[0]>) => {
  const onClick = jest.fn();

  const data = getExpandAction({
    name: 'Test expand action',
    description: 'This is a test expand action',
    'data-test-subj': 'testExpandAction',
    isExpanded: () => true,
    onClick,
    ...params,
  });

  const icon = (data.icon as Function)();

  return { onClick, icon, onClickAction: data.onClick };
};

describe('getExpandAction', () => {
  describe('when isExpanded is true', () => {
    const isExpanded = () => true;

    it('returns an action with arrowDown icon', () => {
      // When
      const { icon } = setup({ isExpanded });

      // Then
      expect(icon).toBe('arrowDown');
    });

    describe('when the action is clicked', () => {
      it('calls onClick with undefined', async () => {
        // Given
        const { onClick, onClickAction } = setup({ isExpanded });

        // When
        onClickAction?.({}, {} as MouseEvent<Element>);

        // Then
        expect(onClick).toHaveBeenCalledWith(undefined);
      });
    });
  });

  describe('when isExpanded is false', () => {
    const isExpanded = () => false;

    it('returns an action with arrowRight icon', () => {
      // When
      const { icon } = setup({ isExpanded });

      // Then
      expect(icon).toBe('arrowRight');
    });

    describe('when the action is clicked', () => {
      it('calls onClick with an empty object', async () => {
        // Given
        const { onClick, onClickAction } = setup({ isExpanded });

        // When
        onClickAction?.({}, {} as MouseEvent<Element>);

        // Then
        expect(onClick).toHaveBeenCalledWith({});
      });
    });
  });
});
