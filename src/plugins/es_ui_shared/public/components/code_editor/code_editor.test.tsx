/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import EuiCodeEditor from './code_editor';
// @ts-ignore
import { keys } from '@elastic/eui/lib/services';
import { findTestSubject, requiredProps, takeMountedSnapshot } from '@elastic/eui/lib/test';

describe('EuiCodeEditor', () => {
  test('is rendered', () => {
    const component = mount(<EuiCodeEditor {...requiredProps} />);
    expect(takeMountedSnapshot(component)).toMatchSnapshot();
  });

  describe('props', () => {
    describe('isReadOnly', () => {
      test('renders alternate hint text', () => {
        const component = mount(<EuiCodeEditor isReadOnly />);
        expect(takeMountedSnapshot(component)).toMatchSnapshot();
      });
    });

    describe('theme', () => {
      test('renders terminal theme', () => {
        const component = mount(<EuiCodeEditor theme="terminal" />);
        expect(takeMountedSnapshot(component)).toMatchSnapshot();
      });
    });

    describe('aria attributes', () => {
      test('allows setting aria-labelledby on textbox', () => {
        const component = mount(<EuiCodeEditor aria-labelledby="labelledbyid" />);
        expect(takeMountedSnapshot(component)).toMatchSnapshot();
      });

      test('allows setting aria-describedby on textbox', () => {
        const component = mount(<EuiCodeEditor aria-describedby="describedbyid" />);
        expect(takeMountedSnapshot(component)).toMatchSnapshot();
      });
    });
  });

  describe('behavior', () => {
    let component: ReactWrapper;

    beforeEach(() => {
      // Addresses problems with attaching to document.body.
      // https://meganesulli.com/blog/managing-focus-with-react-and-jest/
      const container = document.createElement('div');
      document.body.appendChild(container);

      // We need to manually attach the element to document.body to assert against
      // document.activeElement in our focus behavior tests, below.
      component = mount(<EuiCodeEditor />, { attachTo: container });
    });

    afterEach(() => {
      // We need to clean up after ourselves per https://github.com/enzymejs/enzyme/issues/2337.
      if (component) {
        component.unmount();
      }
    });

    describe('hint element', () => {
      test('should be tabable', () => {
        const hint = findTestSubject(component, 'codeEditorHint').getDOMNode();
        expect(hint).toMatchSnapshot();
      });

      test('should be disabled when the ui ace box gains focus', () => {
        const hint = findTestSubject(component, 'codeEditorHint');
        hint.simulate('keyup', { key: keys.ENTER });
        expect(findTestSubject(component, 'codeEditorHint').getDOMNode()).toMatchSnapshot();
      });

      test('should be enabled when the ui ace box loses focus', () => {
        const hint = findTestSubject(component, 'codeEditorHint');
        hint.simulate('keyup', { key: keys.ENTER });
        // @ts-ignore onBlurAce is known to exist and its params are only passed through to the onBlur callback
        component.instance().onBlurAce();
        expect(findTestSubject(component, 'codeEditorHint').getDOMNode()).toMatchSnapshot();
      });
    });

    describe('interaction', () => {
      test('bluring the ace textbox should call a passed onBlur prop', () => {
        const blurSpy = jest.fn().mockName('blurSpy');
        const el = mount(<EuiCodeEditor onBlur={blurSpy} />);
        // @ts-ignore onBlurAce is known to exist and its params are only passed through to the onBlur callback
        el.instance().onBlurAce();
        expect(blurSpy).toHaveBeenCalled();
      });

      test('pressing escape in ace textbox will enable overlay', () => {
        // We cannot simulate the `commands` path, but this interaction still
        // serves as a fallback in cases where `commands` is unavailable.
        // @ts-ignore onFocusAce is known to exist
        component.instance().onFocusAce();
        // @ts-ignore onKeydownAce is known to exist and its params' values are unimportant
        component.instance().onKeydownAce({
          preventDefault: () => {},
          stopPropagation: () => {},
          key: keys.ESCAPE,
        });
        const hint = findTestSubject(component, 'codeEditorHint').getDOMNode();
        expect(hint).toBe(document.activeElement);
      });
    });
  });
});
