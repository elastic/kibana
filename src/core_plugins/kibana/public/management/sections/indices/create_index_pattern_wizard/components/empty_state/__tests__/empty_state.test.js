import React from 'react';
import { EmptyState } from '../empty_state';
import { shallow } from 'enzyme';
import sinon from 'sinon';

describe('EmptyState', () => {
  it('should render normally', () => {
    const component = shallow(
      <EmptyState
        loadingDataDocUrl="http://www.elastic.co"
        onRefresh={() => {}}
      />
    );

    expect(component).toMatchSnapshot();
  });

  describe('props', () => {
    describe('onRefresh', () => {
      it('is called when refresh button is clicked', () => {
        const onRefreshHandler = sinon.stub();

        const component = shallow(
          <EmptyState
            loadingDataDocUrl="http://www.elastic.co"
            onRefresh={onRefreshHandler}
          />
        );

        component.find('[data-test-subj="refreshIndicesButton"]').simulate('click');

        sinon.assert.calledOnce(onRefreshHandler);
      });
    });
  });
});
