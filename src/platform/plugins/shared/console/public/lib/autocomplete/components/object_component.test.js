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
import { SimpleParamComponent } from './simple_param_component';
import { WalkingState, populateContext, walkTokenPath } from '../engine';

describe('WHEN matching object child rules', () => {
  it('SHOULD pair matching constant children with same-name global rules as fallback', () => {
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
      next: [firstConstantChild, secondConstantChild, globalChild],
      nextGroups: [
        { next: [firstConstantChild, secondConstantChild] },
        { next: [globalChild], fallback: true },
      ],
    });
    expect(globalComponentResolver).toHaveBeenCalledWith('query', false);
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

  it('SHOULD expose only explicit states when wildcard and global rules match the full path', () => {
    const wildcard = new SharedComponent('*');
    const wildcardObjectOpen = new ConstantComponent('{', wildcard);
    const wildcardQueryChild = new ConstantComponent('wildcard_query_child', wildcardObjectOpen);
    const globalObjectOpen = new ConstantComponent('{');
    new ConstantComponent('global_query_child', globalObjectOpen);
    const globalComponentResolver = jest.fn(() => [globalObjectOpen]);
    const component = new ObjectComponent('object', [], [wildcard]);

    const states = walkTokenPath(
      ['query', '{'],
      [new WalkingState('ROOT', [component], [])],
      { globalComponentResolver },
      null
    );

    expect(states.flatMap((state) => state.components)).toEqual([wildcardQueryChild]);
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
    const context = { globalComponentResolver };

    populateContext(['query', '{'], context, null, true, [component]);

    expect(context.autoCompleteSet).toEqual([{ name: 'wildcard_query_child' }]);
    expect(globalComponentResolver).toHaveBeenCalledWith('query', false);
  });

  it('SHOULD keep global rules when wildcard children match but have no suggestions', () => {
    const wildcard = new SharedComponent('*');
    new ConstantComponent('{', wildcard);
    const globalObjectOpen = new ConstantComponent('{');
    new ConstantComponent('global_query_child', globalObjectOpen);
    const globalComponentResolver = jest.fn(() => [globalObjectOpen]);
    const component = new ObjectComponent('object', [], [wildcard]);
    const context = { globalComponentResolver };

    populateContext(['query', '{'], context, null, true, [component]);

    expect(context.autoCompleteSet).toEqual([{ name: 'global_query_child' }]);
    expect(globalComponentResolver).toHaveBeenCalledWith('query', false);
  });

  it('SHOULD hide same-name global rules when constant children produce suggestions', () => {
    const queryConstant = new ConstantComponent('query');
    const queryObjectOpen = new ConstantComponent('{', queryConstant);
    queryObjectOpen.addComponent(
      new ObjectComponent('inner', [new ConstantComponent('explicit_query_child')], [])
    );
    const globalObjectOpen = new ConstantComponent('{');
    const globalQueryChild = new ConstantComponent('global_query_child', globalObjectOpen);
    const globalGetTerms = jest.spyOn(globalQueryChild, 'getTerms');
    const globalComponentResolver = jest.fn(() => [globalObjectOpen]);
    const component = new ObjectComponent('object', [queryConstant], []);
    const context = { globalComponentResolver };

    populateContext(['query', '{'], context, null, true, [component]);

    expect(context.autoCompleteSet).toEqual([{ name: 'explicit_query_child' }]);
    expect(globalGetTerms).not.toHaveBeenCalled();
    expect(globalComponentResolver).toHaveBeenCalledWith('query', false);
  });

  it('SHOULD apply context from the explicit branch when its suggestions preempt a global rule', () => {
    const queryConstant = new ConstantComponent('query');
    const explicitObjectOpen = new SimpleParamComponent('explicitBranch', queryConstant);
    explicitObjectOpen.addComponent(new ConstantComponent('explicit_query_child'));
    const globalObjectOpen = new SimpleParamComponent('globalBranch');
    const globalComponentResolver = jest.fn(() => [globalObjectOpen]);
    const component = new ObjectComponent('object', [queryConstant], []);
    const context = { globalComponentResolver };

    populateContext(['query', '{'], context, null, true, [component]);

    expect(context.autoCompleteSet).toEqual([{ name: 'explicit_query_child' }]);
    expect(context.explicitBranch).toBe('{');
    expect(context.globalBranch).toBeUndefined();
  });

  it('SHOULD hide an outer global rule when explicit terms require two nested fallbacks', () => {
    const outerKey = new ConstantComponent('outer');
    const innerOneKey = new ConstantComponent('inner_one');
    innerOneKey.addComponent(new ConstantComponent('not_inner_two'));
    outerKey.addComponent(new ObjectComponent('inner_one_object', [innerOneKey], []));

    const innerTwoKey = new ConstantComponent('inner_two');
    innerTwoKey.addComponent(new SharedComponent('no_terms'));
    const innerTwoObject = new ObjectComponent('inner_two_object', [innerTwoKey], []);
    const explicitTerm = new ConstantComponent('explicit_term');

    const outerFallbackStepOne = new SharedComponent('outer_fallback_step_one');
    const outerFallbackStepTwo = new SharedComponent(
      'outer_fallback_step_two',
      outerFallbackStepOne
    );
    const outerFallbackTerm = new ConstantComponent('outer_fallback_term', outerFallbackStepTwo);
    const outerFallbackGetTerms = jest.spyOn(outerFallbackTerm, 'getTerms');

    const component = new ObjectComponent('outer_object', [outerKey], []);
    const globalComponentResolver = jest.fn((token) => {
      if (token === 'outer') {
        return [outerFallbackStepOne];
      }
      if (token === 'inner_one') {
        return [innerTwoObject];
      }
      if (token === 'inner_two') {
        return [explicitTerm];
      }
      return null;
    });
    const context = { globalComponentResolver };

    populateContext(['outer', 'inner_one', 'inner_two'], context, null, true, [component]);

    expect(context.autoCompleteSet).toEqual([{ name: 'explicit_term' }]);
    expect(outerFallbackGetTerms).not.toHaveBeenCalled();
  });

  it('SHOULD apply context from the global fallback when only it produces suggestions', () => {
    const queryConstant = new ConstantComponent('query');
    new SimpleParamComponent('explicitBranch', queryConstant);
    const globalObjectOpen = new SimpleParamComponent('globalBranch');
    globalObjectOpen.addComponent(new ConstantComponent('global_query_child'));
    const globalComponentResolver = jest.fn(() => [globalObjectOpen]);
    const component = new ObjectComponent('object', [queryConstant], []);
    const context = { globalComponentResolver };

    populateContext(['query', '{'], context, null, true, [component]);

    expect(context.autoCompleteSet).toEqual([{ name: 'global_query_child' }]);
    expect(context.explicitBranch).toBeUndefined();
    expect(context.globalBranch).toBe('{');
  });

  it('SHOULD keep global rules when constant children match but have no suggestions', () => {
    // Regression test for the console FTR suite: at runtime the `search` endpoint
    // declares `query: {}` (an empty subtree) while Query DSL suggestions come from
    // the same-name GLOBAL.query rule, so the global branch must survive the walk.
    const queryConstant = new ConstantComponent('query');
    const queryObjectOpen = new ConstantComponent('{', queryConstant);
    queryObjectOpen.addComponent(new ObjectComponent('inner', [], []));
    const globalObjectOpen = new ConstantComponent('{');
    new ConstantComponent('global_query_child', globalObjectOpen);
    const globalComponentResolver = jest.fn((token) =>
      token === 'query' ? [globalObjectOpen] : null
    );
    // runtime body root shape: ConstantComponent('{') wrapping the key matcher
    const bodyRoot = new ConstantComponent('{');
    bodyRoot.addComponent(new ObjectComponent('object', [queryConstant], []));
    const context = { globalComponentResolver };

    populateContext(['{', 'query', '{'], context, null, true, [bodyRoot]);

    expect(context.autoCompleteSet).toEqual([{ name: 'global_query_child' }]);
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
