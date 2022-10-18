/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { render } from '@testing-library/react';
import React, { ReactElement } from 'react';
import { ElementType } from 'react';
import { generateLinedRulesMenuItems } from '.';
import { rules } from '../mocks/rule_references.mock';

const dataTestSubj = 'generateLinedRulesMenuItemsTest';
const linkedRules = rules;
const securityLinkAnchorComponent = ({
  referenceName,
  referenceId,
}: {
  referenceName: string;
  referenceId: string;
}) => (
  <div data-test-subj="securityLinkAnchorComponent">
    <a href={referenceId}>{referenceName}</a>
  </div>
);
describe('generateLinedRulesMenuItems', () => {
  it('should not render if the linkedRules length is falsy', () => {
    const result = generateLinedRulesMenuItems({
      dataTestSubj,
      linkedRules: [],
      securityLinkAnchorComponent,
    });
    expect(result).toBeNull();
  });
  it('should not render if the securityLinkAnchorComponent length is falsy', () => {
    const result = generateLinedRulesMenuItems({
      dataTestSubj,
      linkedRules,
      securityLinkAnchorComponent: null as unknown as ElementType,
    });
    expect(result).toBeNull();
  });
  it('should render the first linked rules with left icon and does not apply the css if the length is 1', () => {
    const result: ReactElement[] = generateLinedRulesMenuItems({
      dataTestSubj,
      linkedRules,
      securityLinkAnchorComponent,
      leftIcon: 'check',
    }) as ReactElement[];

    result.map((link) => {
      const wrapper = render(link);
      expect(wrapper).toMatchSnapshot();
      expect(wrapper.getByTestId('generateLinedRulesMenuItemsTestActionItem1a2b3c'));
      expect(wrapper.getByTestId('generateLinedRulesMenuItemsTestLeftIcon'));
    });
  });
  it('should render the second linked rule and apply the css when the length is > 1', () => {
    const result: ReactElement[] = generateLinedRulesMenuItems({
      dataTestSubj,
      linkedRules: [
        ...rules,
        {
          exception_lists: [],
          id: '2a2b3c',
          name: 'Simple Rule Query 2',
          rule_id: 'rule-2',
        },
      ],
      securityLinkAnchorComponent,
    }) as ReactElement[];

    const wrapper = render(result[1]);
    expect(wrapper).toMatchSnapshot();
    expect(wrapper.getByTestId('generateLinedRulesMenuItemsTestActionItem2a2b3c'));
  });
});
