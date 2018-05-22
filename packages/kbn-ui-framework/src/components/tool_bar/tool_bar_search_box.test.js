import React from 'react';
import { render, mount } from 'enzyme';
import sinon from 'sinon';
import { requiredProps } from '../../test/required_props';

import {
  KuiToolBarSearchBox,
} from './tool_bar_search_box';

const onFilter = sinon.stub();

test('renders KuiToolBarSearchBox', () => {
  const component = <KuiToolBarSearchBox onFilter={onFilter} {...requiredProps} />;
  expect(render(component)).toMatchSnapshot();
});

describe('onFilter', () => {
  test('is called on change event, with the value entered', () => {
    const searchBox = mount(<KuiToolBarSearchBox onFilter={onFilter} {...requiredProps} />);
    onFilter.resetHistory();
    const event = { target: { value: 'a' } };
    searchBox.find('input').simulate('change', event);
    sinon.assert.calledWith(onFilter, 'a');
  });
});

describe('filter', () => {
  test('initializes search box value', () => {
    const component = <KuiToolBarSearchBox onFilter={onFilter} filter="My Query" />;
    expect(render(component)).toMatchSnapshot();
  });
});

describe('placeholder', () => {
  test('initializes search box placeholder', () => {
    const component = <KuiToolBarSearchBox onFilter={onFilter} placeholder="Filter items..." />;
    expect(render(component)).toMatchSnapshot();
  });
});

