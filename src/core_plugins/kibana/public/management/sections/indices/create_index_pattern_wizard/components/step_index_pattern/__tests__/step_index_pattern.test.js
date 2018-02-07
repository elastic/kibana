import React from 'react';
import { shallow } from 'enzyme';

import { StepIndexPattern } from '../step_index_pattern';

jest.mock('../components/indices_list', () => ({ IndicesList: 'IndicesList' }));
jest.mock('../components/loading_indices', () => ({ LoadingIndices: 'LoadingIndices' }));
jest.mock('../components/status_message', () => ({ StatusMessage: 'StatusMessage' }));
jest.mock('../components/header', () => ({ Header: 'Header' }));
jest.mock('../../../lib/create_reasonable_wait', () => ({ createReasonableWait: fn => fn() }));
jest.mock('../../../lib/get_indices', () => ({
  getIndices: () => {
    return [
      { name: 'kibana' },
    ];
  },
}));
jest.mock('../../../lib/is_query_a_match', () => ({ isQueryAMatch: () => true }));

const allIndices = [{ name: 'kibana' }, { name: 'es' }];
const esService = {};
const goToNextStep = () => {};

describe('StepIndexPattern', () => {
  it('should render normally', () => {
    const component = shallow(
      <StepIndexPattern
        allIndices={allIndices}
        isIncludingSystemIndices={false}
        esService={esService}
        goToNextStep={goToNextStep}
        initialQuery={'k'}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should render the loading state', () => {
    const component = shallow(
      <StepIndexPattern
        allIndices={allIndices}
        isIncludingSystemIndices={false}
        esService={esService}
        goToNextStep={goToNextStep}
      />
    );

    component.setState({ query: 'k', isLoadingIndices: true });

    expect(component).toMatchSnapshot();
  });

  it('should render some indices', async () => {
    const component = shallow(
      <StepIndexPattern
        allIndices={allIndices}
        isIncludingSystemIndices={false}
        esService={esService}
        goToNextStep={goToNextStep}
      />
    );

    const instance = component.instance();

    await instance.onQueryChanged({
      nativeEvent: { data: 'k' },
      target: { value: 'k' }
    });

    component.update();

    expect(component).toMatchSnapshot();
  });

  it('should show errors', async () => {
    const component = shallow(
      <StepIndexPattern
        allIndices={allIndices}
        isIncludingSystemIndices={false}
        esService={esService}
        goToNextStep={goToNextStep}
      />
    );

    const instance = component.instance();

    await instance.onQueryChanged({
      nativeEvent: { data: '?' },
      target: { value: '?' }
    });

    component.update();

    expect(component).toMatchSnapshot();
  });

  it('should ensure we properly append a wildcard', async () => {
    const component = shallow(
      <StepIndexPattern
        allIndices={allIndices}
        isIncludingSystemIndices={false}
        esService={esService}
        savedObjectsClient={{
          find: () => ({ savedObjects: [
            { attributes: { title: 'k*' } }
          ] })
        }}
        goToNextStep={goToNextStep}
      />
    );

    const instance = component.instance();

    instance.onQueryChanged({ target: { value: 'k' } });
    await component.update();

    expect(component).toMatchSnapshot();
  });
});
