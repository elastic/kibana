/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import { render, mount } from 'enzyme';
import sinon from 'sinon';
import { requiredProps } from '../../test/required_props';

import { KuiPopover } from './popover';

import { keyCodes } from '../../services';

describe('KuiPopover', () => {
  test('is rendered', () => {
    const component = render(
      <KuiPopover
        button={<button />}
        closePopover={() => {}}
        {...requiredProps}
      />
    );

    expect(component)
      .toMatchSnapshot();
  });

  test('children is rendered', () => {
    const component = render(
      <KuiPopover
        button={<button />}
        closePopover={() => {}}
      >
        Children
      </KuiPopover>
    );

    expect(component)
      .toMatchSnapshot();
  });

  describe('props', () => {
    describe('withTitle', () => {
      test('is rendered', () => {
        const component = render(
          <KuiPopover
            withTitle
            button={<button />}
            closePopover={() => {}}
          />
        );

        expect(component)
          .toMatchSnapshot();
      });
    });

    describe('closePopover', () => {
      it('is called when ESC key is hit', () => {
        const closePopoverHandler = sinon.stub();

        const component = mount(
          <KuiPopover
            withTitle
            button={<button />}
            closePopover={closePopoverHandler}
          />
        );

        component.simulate('keydown', { keyCode: keyCodes.ESCAPE });
        sinon.assert.calledOnce(closePopoverHandler);
      });
    });

    describe('anchorPosition', () => {
      test('defaults to center', () => {
        const component = render(
          <KuiPopover
            button={<button />}
            closePopover={() => {}}
          />
        );

        expect(component)
          .toMatchSnapshot();
      });

      test('left is rendered', () => {
        const component = render(
          <KuiPopover
            button={<button />}
            closePopover={() => {}}
            anchorPosition="left"
          />
        );

        expect(component)
          .toMatchSnapshot();
      });

      test('right is rendered', () => {
        const component = render(
          <KuiPopover
            button={<button />}
            closePopover={() => {}}
            anchorPosition="right"
          />
        );

        expect(component)
          .toMatchSnapshot();
      });
    });

    describe('isOpen', () => {
      test('defaults to false', () => {
        const component = render(
          <KuiPopover
            button={<button />}
            closePopover={() => {}}
          />
        );

        expect(component)
          .toMatchSnapshot();
      });

      test('renders true', () => {
        const component = render(
          <KuiPopover
            button={<button />}
            closePopover={() => {}}
            isOpen
          />
        );

        expect(component)
          .toMatchSnapshot();
      });
    });

    describe('ownFocus', () => {
      test('defaults to false', () => {
        const component = render(
          <KuiPopover
            isOpen
            button={<button />}
            closePopover={() => {}}
          />
        );

        expect(component)
          .toMatchSnapshot();
      });

      test('renders true', () => {
        const component = render(
          <KuiPopover
            isOpen
            ownFocus
            button={<button />}
            closePopover={() => {}}
          />
        );

        expect(component)
          .toMatchSnapshot();
      });
    });

    describe('panelClassName', () => {
      test('is rendered', () => {
        const component = render(
          <KuiPopover
            button={<button />}
            closePopover={() => {}}
            panelClassName="test"
            isOpen
          />
        );

        expect(component)
          .toMatchSnapshot();
      });
    });

    describe('panelPaddingSize', () => {
      test('is rendered', () => {
        const component = render(
          <KuiPopover
            button={<button />}
            closePopover={() => {}}
            panelPaddingSize="s"
            isOpen
          />
        );

        expect(component)
          .toMatchSnapshot();
      });
    });
  });
});
