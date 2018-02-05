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
const savedObjectsClient = {
  find: () => ({ savedObjects: [] })
};
const goToNextStep = () => {};

describe('StepIndexPattern', () => {
  it('should render normally', () => {
    const component = shallow(
      <StepIndexPattern
        allIndices={allIndices}
        isIncludingSystemIndices={false}
        esService={esService}
        savedObjectsClient={savedObjectsClient}
        goToNextStep={goToNextStep}
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
        savedObjectsClient={savedObjectsClient}
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
        savedObjectsClient={savedObjectsClient}
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
        savedObjectsClient={savedObjectsClient}
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

  it('should properly fetch indices for the initial query', async () => {
    const component = shallow(
      <StepIndexPattern
        allIndices={allIndices}
        isIncludingSystemIndices={false}
        esService={esService}
        savedObjectsClient={savedObjectsClient}
        goToNextStep={goToNextStep}
        initialQuery="k*"
      />
    );

    // Allow the componentWillMount code to execute
    // https://github.com/airbnb/enzyme/issues/450
    await component.update(); // Fire `componentWillMount()`
    await component.update(); // Force update the component post async actions

    expect(component).toMatchSnapshot();
  });

  it('should disable the next step if the index pattern exists', async () => {
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
        initialQuery="k*"
      />
    );

    // Allow the componentWillMount code to execute
    // https://github.com/airbnb/enzyme/issues/450
    await component.update(); // Fire `componentWillMount()`
    await component.update(); // Force update the component post async actions

    expect(component).toMatchSnapshot();
  });
});
