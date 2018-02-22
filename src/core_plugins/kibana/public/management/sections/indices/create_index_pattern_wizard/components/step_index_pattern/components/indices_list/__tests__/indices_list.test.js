import React from 'react';
import { IndicesList } from '../indices_list';
import { shallow } from 'enzyme';

const indices = [
  { name: 'kibana' },
  { name: 'es' }
];

describe('IndicesList', () => {
  it('should render normally', () => {
    const component = shallow(
      <IndicesList indices={indices} query=""/>
    );

    expect(component).toMatchSnapshot();
  });

  it('should change pages', () => {
    const component = shallow(
      <IndicesList indices={indices} query=""/>
    );

    const instance = component.instance();

    component.setState({ perPage: 1 });
    instance.onChangePage(1);
    component.update();

    expect(component).toMatchSnapshot();
  });

  it('should change per page', () => {
    const component = shallow(
      <IndicesList indices={indices} query="" />
    );

    const instance = component.instance();
    instance.onChangePerPage(1);
    component.update();

    expect(component).toMatchSnapshot();
  });

  it('should highlight the query in the matches', () => {
    const component = shallow(
      <IndicesList indices={indices} query="ki" />
    );

    expect(component).toMatchSnapshot();
  });

  describe('updating props', () => {
    it('should render all new indices', () => {
      const component = shallow(
        <IndicesList indices={indices} query=""/>
      );

      const moreIndices = [
        ...indices,
        ...indices,
        ...indices,
        ...indices,
        ...indices,
        ...indices,
        ...indices,
        ...indices,
      ];

      component.setProps({ indices: moreIndices });
      component.update();
      expect(component).toMatchSnapshot();
    });
  });
});
