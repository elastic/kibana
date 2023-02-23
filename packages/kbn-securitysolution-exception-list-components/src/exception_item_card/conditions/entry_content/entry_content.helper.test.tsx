/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { ListOperatorTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { OPERATOR_TYPE_LABELS_EXCLUDED, OPERATOR_TYPE_LABELS_INCLUDED } from '../conditions.config';
import { getEntryOperator, getValue, getValueExpression } from './entry_content.helper';
import { render } from '@testing-library/react';
import {
  includedExistsTypeEntry,
  includedListTypeEntry,
  includedMatchTypeEntry,
} from '../../../mocks/entry.mock';

describe('entry_content.helper', () => {
  describe('getEntryOperator', () => {
    it('should return empty if type is nested', () => {
      const result = getEntryOperator(ListOperatorTypeEnum.NESTED, 'included');
      expect(result).toBeFalsy();
      expect(result).toEqual('');
    });
    it('should return the correct labels for OPERATOR_TYPE_LABELS_INCLUDED when operator is included', () => {
      const allKeys = Object.keys(OPERATOR_TYPE_LABELS_INCLUDED);
      const [, ...withoutNested] = allKeys;
      withoutNested.forEach((key) => {
        const result = getEntryOperator(key as ListOperatorTypeEnum, 'included');
        const expectedLabel = OPERATOR_TYPE_LABELS_INCLUDED[key as ListOperatorTypeEnum];
        expect(result).toEqual(expectedLabel);
      });
    });
    it('should return the correct labels for OPERATOR_TYPE_LABELS_EXCLUDED when operator is excluded', () => {
      const allKeys = Object.keys(OPERATOR_TYPE_LABELS_EXCLUDED);
      const [, ...withoutNested] = allKeys;
      withoutNested.forEach((key) => {
        const result = getEntryOperator(key as ListOperatorTypeEnum, 'excluded');
        const expectedLabel =
          OPERATOR_TYPE_LABELS_EXCLUDED[
            key as Exclude<ListOperatorTypeEnum, ListOperatorTypeEnum.NESTED>
          ];
        expect(result).toEqual(expectedLabel);
      });
    });
    it('should return the type when it is neither OPERATOR_TYPE_LABELS_INCLUDED nor OPERATOR_TYPE_LABELS_EXCLUDED', () => {
      const result = getEntryOperator('test' as ListOperatorTypeEnum, 'included');
      expect(result).toEqual('test');
    });
  });
  describe('getValue', () => {
    it('should return list.id when entry type is "list"', () => {
      expect(getValue(includedListTypeEntry)).toEqual('list_id');
    });
    it('should return value when entry type is not  "list"', () => {
      expect(getValue(includedMatchTypeEntry)).toEqual('matches value');
    });
    it('should return empty string when type does not have value', () => {
      expect(getValue(includedExistsTypeEntry)).toEqual('');
    });
  });
  describe('getValueExpression', () => {
    it('should render multiple values in badges when operator type is match_any and values is Array', () => {
      const wrapper = render(
        getValueExpression(ListOperatorTypeEnum.MATCH_ANY, 'included', ['value 1', 'value 2'])
      );
      expect(wrapper.getByTestId('matchAnyBadge0')).toHaveTextContent('value 1');
      expect(wrapper.getByTestId('matchAnyBadge1')).toHaveTextContent('value 2');
    });
    it('should return one value when operator type is match_any and values is not Array', () => {
      const wrapper = render(
        getValueExpression(ListOperatorTypeEnum.MATCH_ANY, 'included', 'value 1')
      );
      expect(wrapper.getByTestId('entryValueExpression')).toHaveTextContent('value 1');
    });
    it('should return one value when operator type is a single value', () => {
      const wrapper = render(
        getValueExpression(ListOperatorTypeEnum.EXISTS, 'included', 'value 1')
      );
      expect(wrapper.getByTestId('entryValueExpression')).toHaveTextContent('value 1');
    });
    it('should return value with warning icon when the value contains a leading or trailing space', () => {
      const wrapper = render(
        getValueExpression(ListOperatorTypeEnum.EXISTS, 'included', ' value 1')
      );
      expect(wrapper.getByTestId('entryValueExpression')).toHaveTextContent(' value 1');
      expect(wrapper.getByTestId('valueWithSpaceWarningTooltip')).toBeInTheDocument();
    });
    it('should return value without warning icon when the value does not contain a leading or trailing space', () => {
      const wrapper = render(
        getValueExpression(ListOperatorTypeEnum.EXISTS, 'included', 'value 1')
      );
      expect(wrapper.getByTestId('entryValueExpression')).toHaveTextContent(' value 1');
      expect(wrapper.queryByTestId('valueWithSpaceWarningTooltip')).not.toBeInTheDocument();
    });
  });
});
