/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ConstantComponent } from './constant_component';
import { ObjectComponent } from './object_component';
import { SharedComponent } from './shared_component';
import { WalkingState, populateContext, walkTokenPath } from '../engine';
import type { AutoCompleteContext } from '../types';

type TestContext = AutoCompleteContext & {
  globalComponentResolver: (
    token: unknown,
    nested: boolean
  ) => Array<ConstantComponent | SharedComponent> | null;
};

describe('WHEN matching object child rules', () => {
  it('SHOULD return every matching constant child before wildcard and global rules', () => {
    const firstConstant = new ConstantComponent('query');
    const secondConstant = new ConstantComponent('query');
    const wildcard = new SharedComponent('*');
    const firstConstantChild = new SharedComponent('first_constant_child', firstConstant);
    const secondConstantChild = new SharedComponent('second_constant_child', secondConstant);
    wildcard.addComponent(new SharedComponent('wildcard_child'));
    const globalChild = new SharedComponent('global_child');
    const globalComponentResolver = jest.fn(() => [globalChild]);
    const component = new ObjectComponent('object', [firstConstant, secondConstant], [wildcard]);

    expect(component.match('query', { globalComponentResolver }, null)).toEqual({
      next: [firstConstantChild, secondConstantChild],
    });
    expect(globalComponentResolver).not.toHaveBeenCalled();
  });

  it('SHOULD order every matching wildcard child before a same-name global rule', () => {
    const firstWildcard = new SharedComponent('*');
    const secondWildcard = new SharedComponent('*');
    const firstWildcardChild = new SharedComponent('first_wildcard_child', firstWildcard);
    const secondWildcardChild = new SharedComponent('second_wildcard_child', secondWildcard);
    const globalChild = new SharedComponent('global_child');
    const globalComponentResolver = jest.fn(() => [globalChild]);
    const component = new ObjectComponent(
      'object',
      [new ConstantComponent('other')],
      [firstWildcard, secondWildcard]
    );

    expect(component.match('query', { globalComponentResolver }, null)).toEqual({
      next: [firstWildcardChild, secondWildcardChild, globalChild],
      nextGroups: [
        { next: [firstWildcardChild, secondWildcardChild] },
        { next: [globalChild], fallback: true },
      ],
    });
    expect(globalComponentResolver).toHaveBeenCalledWith('query', false);
  });

  it('SHOULD keep global rules available when wildcard children cannot match the next token', () => {
    const wildcard = new SharedComponent('*');
    new ConstantComponent('wildcard_string_value', wildcard);
    const globalObjectOpen = new ConstantComponent('{');
    const globalQueryChild = new ConstantComponent('global_query_child', globalObjectOpen);
    const globalComponentResolver = jest.fn(() => [globalObjectOpen]);
    const component = new ObjectComponent('object', [], [wildcard]);

    const states = walkTokenPath(
      ['query', '{'],
      [new WalkingState('ROOT', [component], [])],
      { globalComponentResolver },
      null
    );

    expect(states.flatMap((state) => state.components)).toEqual([globalQueryChild]);
    expect(globalComponentResolver).toHaveBeenCalledWith('query', false);
  });

  it('SHOULD hide same-name global rules when wildcard children match the full token path', () => {
    const wildcard = new SharedComponent('*');
    const wildcardObjectOpen = new ConstantComponent('{', wildcard);
    new ConstantComponent('wildcard_query_child', wildcardObjectOpen);
    const globalObjectOpen = new ConstantComponent('{');
    new ConstantComponent('global_query_child', globalObjectOpen);
    const globalComponentResolver = jest.fn(() => [globalObjectOpen]);
    const component = new ObjectComponent('object', [], [wildcard]);
    const context: TestContext = { globalComponentResolver };

    populateContext(['query', '{'], context, null, true, [component]);

    expect(context.autoCompleteSet).toEqual([{ name: 'wildcard_query_child' }]);
    expect(globalComponentResolver).toHaveBeenCalledWith('query', false);
  });

  it('SHOULD use same-name global rules when no explicit rule matches', () => {
    const globalChild = new SharedComponent('global_child');
    const globalComponentResolver = jest.fn(() => [globalChild]);
    const component = new ObjectComponent('object', [new ConstantComponent('other')], []);

    expect(component.match('query', { globalComponentResolver }, null)).toEqual({
      next: [globalChild],
    });
    expect(globalComponentResolver).toHaveBeenCalledWith('query', false);
  });

  it('SHOULD return no children when no rule matches', () => {
    const globalComponentResolver = jest.fn(() => null);
    const component = new ObjectComponent('object', [new ConstantComponent('other')], []);

    expect(component.match('query', { globalComponentResolver }, null)).toEqual({
      next: [],
    });
  });
});
