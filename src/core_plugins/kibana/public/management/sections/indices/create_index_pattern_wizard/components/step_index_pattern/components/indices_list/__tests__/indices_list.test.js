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
      <IndicesList indices={indices}/>
    );

    expect(component).toMatchSnapshot();
  });

  it('should change pages', () => {
    const component = shallow(
      <IndicesList indices={indices}/>
    );

    const instance = component.instance();

    component.setState({ perPage: 1 });
    instance.onChangePage(1);
    component.update();

    expect(component).toMatchSnapshot();
  });

  it('should change per page', () => {
    const component = shallow(
      <IndicesList indices={indices}/>
    );

    const instance = component.instance();
    instance.onChangePerPage(1);
    component.update();

    expect(component).toMatchSnapshot();
  });

  describe('updating props', () => {
    it('should render all new indices', () => {
      const component = shallow(
        <IndicesList indices={indices}/>
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
