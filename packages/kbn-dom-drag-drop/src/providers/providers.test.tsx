/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { mount } from 'enzyme';
import { RootDragDropProvider, useDragDropContext } from '.';

jest.useFakeTimers({ legacyFakeTimers: true });

describe('RootDragDropProvider', () => {
  test('reuses contexts for each render', () => {
    const contexts: Array<{}> = [];
    const TestComponent = ({ name }: { name: string }) => {
      const context = useDragDropContext();
      contexts.push(context);
      return (
        <div data-test-subj="test-component">
          {name} {!!context[0].dragging}
        </div>
      );
    };

    const RootComponent = ({ name }: { name: string }) => (
      <RootDragDropProvider>
        <TestComponent name={name} />
      </RootDragDropProvider>
    );

    const component = mount(<RootComponent name="aaaa" />);

    component.setProps({ name: 'bbbb' });

    expect(component.find('[data-test-subj="test-component"]').text()).toContain('bbb');
    expect(contexts.length).toEqual(2);
    expect(contexts[0]).toStrictEqual(contexts[1]);
  });
});
