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
