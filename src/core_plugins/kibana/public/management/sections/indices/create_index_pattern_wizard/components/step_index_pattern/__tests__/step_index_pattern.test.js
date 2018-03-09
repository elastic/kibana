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

const allIndices = [{ name: 'kibana' }, { name: 'es' }];
const esService = {};
const goToNextStep = () => {};

describe('StepIndexPattern', () => {
  it('should render normally', async () => {
    const component = shallow(
      <StepIndexPattern
        allIndices={allIndices}
        isIncludingSystemIndices={false}
        esService={esService}
        goToNextStep={goToNextStep}
        initialQuery={'k'}
      />
    );

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

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
      target: { value: 'k' }
    });

    await component.update();

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
        goToNextStep={goToNextStep}
      />
    );

    const instance = component.instance();

    instance.onQueryChanged({ target: { value: 'k' } });
    await component.update();

    expect(component).toMatchSnapshot();
  });

  it('should search for partial indices for queries not ending in a wildcard', async () => {
    const component = shallow(
      <StepIndexPattern
        allIndices={allIndices}
        isIncludingSystemIndices={false}
        esService={esService}
        goToNextStep={goToNextStep}
        initialQuery="k"
      />
    );

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component).toMatchSnapshot();
  });
});
