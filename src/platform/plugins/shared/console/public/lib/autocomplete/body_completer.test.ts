/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ConstantComponent, ObjectComponent, type AutocompleteComponent } from './components';
import { compileBodyDescription } from './body_completer';
import type { AutocompleteMatch } from './components/autocomplete_component';
import { populateContext, WalkingState, walkTokenPath } from './engine';
import type { AutoCompleteContext } from './types';

type TestContext = AutoCompleteContext & {
  endpointComponentResolver: (endpoint: string) => AutocompleteComponent[];
  globalComponentResolver: (term: string) => AutocompleteComponent[] | null;
};

const compileScopeLink = (link: string) =>
  compileBodyDescription(
    'linked_endpoint',
    { __scope_link: link },
    { getComponent: () => undefined }
  );

describe('ScopeResolver fallback rules', () => {
  it('SHOULD compose linked context, priority, and specificity into the caller state', () => {
    class MetadataConstant extends ConstantComponent {
      match(token: unknown, context: AutoCompleteContext, editor: unknown): AutocompleteMatch {
        const result = super.match(token, context, editor);
        return result
          ? {
              ...result,
              context_values: { linkedBranch: 'explicit' },
              priority: 2,
            }
          : result;
      }
    }

    const linkedComponent = new MetadataConstant('query');
    const linkedTerm = new ConstantComponent('linked_term', linkedComponent);
    const context: TestContext & { linkedBranch?: unknown } = {
      endpointComponentResolver: () => [linkedComponent],
      globalComponentResolver: () => null,
    };
    const components = compileScopeLink('source');
    const callerContext = { callerBranch: 'outer' };

    const states = walkTokenPath(
      ['query'],
      [
        new WalkingState('CALLER', components, [callerContext], {
          fallbackGroups: ['caller_fallback'],
          preferredFallbackGroups: ['caller_preferred'],
          priority: 1,
          specificity: 3,
        }),
      ],
      context,
      null,
      true
    );

    expect(states).toHaveLength(1);
    expect(states[0]).toMatchObject({
      components: [linkedTerm],
      contextExtensionList: [callerContext, { linkedBranch: 'explicit' }],
      fallbackGroups: ['caller_fallback'],
      preferredFallbackGroups: ['caller_preferred'],
      priority: 1,
      specificity: 4,
    });

    const statesWithHigherCallerPriority = walkTokenPath(
      ['query'],
      [
        new WalkingState('CALLER', components, [], {
          priority: 3,
        }),
      ],
      context,
      null,
      true
    );
    expect(statesWithHigherCallerPriority[0].priority).toBe(2);

    populateContext(['query'], context, null, false, components);
    expect(context.linkedBranch).toBe('explicit');
  });

  it('SHOULD preserve grouped matches returned directly by a linked component', () => {
    const query = new ConstantComponent('query');
    const explicitOpen = new ConstantComponent('{', query);
    new ConstantComponent('explicit_term', explicitOpen);
    const linkedObject = new ObjectComponent('linked_object', [query], []);

    const globalOpen = new ConstantComponent('{');
    const globalTerm = new ConstantComponent('global_term', globalOpen);
    const globalGetTerms = jest.spyOn(globalTerm, 'getTerms');
    const context: TestContext = {
      endpointComponentResolver: () => [linkedObject],
      globalComponentResolver: (term) => (term === 'query' ? [globalOpen] : null),
    };

    populateContext(['query', '{'], context, null, true, compileScopeLink('source'));

    expect(context.autoCompleteSet).toEqual([{ name: 'explicit_term' }]);
    expect(globalGetTerms).not.toHaveBeenCalled();
  });

  it('SHOULD keep a linked fallback until continuation terms establish viability', () => {
    const query = new ConstantComponent('query');
    new ConstantComponent('{', query);
    const sourceOpen = new ConstantComponent('{');
    sourceOpen.addComponent(new ObjectComponent('source_object', [query], []));

    const globalOpen = new ConstantComponent('{');
    new ConstantComponent('global_term', globalOpen);
    const context: TestContext = {
      endpointComponentResolver: () => [sourceOpen],
      globalComponentResolver: (term) => (term === 'query' ? [globalOpen] : null),
    };

    populateContext(['{'], context, null, true, compileScopeLink('source.query'));

    expect(context.autoCompleteSet).toEqual([{ name: 'global_term' }]);
  });
});
