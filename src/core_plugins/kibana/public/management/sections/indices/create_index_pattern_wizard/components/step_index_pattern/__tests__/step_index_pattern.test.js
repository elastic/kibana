import React from 'react';
import { shallow } from 'enzyme';

import { StepIndexPattern } from '../step_index_pattern';

jest.mock('../components/indices_list', () => ({ IndicesList: 'IndicesList' }));
jest.mock('../components/loading_indices', () => ({ LoadingIndices: 'LoadingIndices' }));
jest.mock('../components/status_message', () => ({ StatusMessage: 'StatusMessage' }));
jest.mock('../components/header', () => ({ Header: 'Header' }));
jest.mock('../../../lib/create_reasonable_wait', () => ({ createReasonableWait: fn => fn() }));
jest.mock('../../../lib/get_indices', () => ({
  getIndices: (service, query) => {
    if (query.startsWith('e')) {
      return [
        { name: 'es' },
      ];
    }

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

  it('ensures the response of the latest request is persisted', async () => {
    const component = shallow(
      <StepIndexPattern
        allIndices={allIndices}
        isIncludingSystemIndices={false}
        esService={esService}
        goToNextStep={goToNextStep}
        initialQuery="k"
      />
    );

    const instance = component.instance();
    instance.onQueryChanged({ target: { value: 'e' } });
    instance.lastQuery = 'k';
    await new Promise(resolve => process.nextTick(resolve));

    // Honesty, the state would match the result of the `k` query but
    // it's hard to mock this in tests but if remove our fix
    // (the early return if the queries do not match) then this
    // equals [{name: 'es'}]
    expect(component.state('exactMatchedIndices')).toEqual([{ name: 'kibana' }]);

    // Ensure it works in the other code flow too (the other early return)

    // Provide `es` so we do not auto append * and enter our other code flow
    instance.onQueryChanged({ target: { value: 'es' } });
    instance.lastQuery = 'k';
    await new Promise(resolve => process.nextTick(resolve));
    expect(component.state('exactMatchedIndices')).toEqual([{ name: 'kibana' }]);
  });
});
