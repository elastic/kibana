import React from 'react';
import { shallow } from 'enzyme';
import { StepIndexPattern } from '../step_index_pattern';

jest.mock('../../../lib/ensure_minimum_time', () => ({
  ensureMinimumTime: async (promises) => Array.isArray(promises) ? await Promise.all(promises) : await promises
}));
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
const savedObjectsClient = {
  find: () => ({ savedObjects: [] })
};
const goToNextStep = () => {};

const createComponent = props => {
  return shallow(
    <StepIndexPattern
      allIndices={allIndices}
      isIncludingSystemIndices={false}
      esService={esService}
      savedObjectsClient={savedObjectsClient}
      goToNextStep={goToNextStep}
      {...props}
    />
  );
};

describe('StepIndexPattern', () => {
  it('renders the loading state', () => {
    const component = createComponent();
    component.setState({ isLoadingIndices: true });
    expect(component.find('[data-test-subj="createIndexPatternStep1Loading"]')).toMatchSnapshot();
  });

  it('renders indices which match the initial query', async () => {
    const component = createComponent({ initialQuery: 'kibana' });

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    await component.update();

    expect(component.find('[data-test-subj="createIndexPatternStep1IndicesList"]')).toMatchSnapshot();
  });

  it('renders errors when input is invalid', async () => {
    const component = createComponent();
    const instance = component.instance();
    instance.onQueryChanged({ target: { value: '?' } });

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component.find('[data-test-subj="createIndexPatternStep1Header"]')).toMatchSnapshot();
  });

  it('renders matching indices when input is valid', async () => {
    const component = createComponent();
    const instance = component.instance();
    instance.onQueryChanged({ target: { value: 'k' } });

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component.find('[data-test-subj="createIndexPatternStep1IndicesList"]')).toMatchSnapshot();
  });

  it('appends a wildcard automatically to queries', async () => {
    const component = createComponent();
    const instance = component.instance();
    instance.onQueryChanged({ target: { value: 'k' } });
    expect(component.state('query')).toBe('k*');
  });

  it('disables the next step if the index pattern exists', async () => {
    const component = createComponent();
    component.setState({ indexPatternExists: true });
    expect(component.find('Header').prop('isNextStepDisabled')).toBe(true);
  });

  it('ensures the response of the latest request is persisted', async () => {
    const component = createComponent();
    const instance = component.instance();
    instance.onQueryChanged({ target: { value: 'e' } });
    instance.lastQuery = 'k';
    await new Promise(resolve => process.nextTick(resolve));

    // Honesty, the state would match the result of the `k` query but
    // it's hard to mock this in tests but if remove our fix
    // (the early return if the queries do not match) then this
    // equals [{name: 'es'}]
    expect(component.state('exactMatchedIndices')).toEqual([]);

    // Ensure it works in the other code flow too (the other early return)

    // Provide `es` so we do not auto append * and enter our other code flow
    instance.onQueryChanged({ target: { value: 'es' } });
    instance.lastQuery = 'k';
    await new Promise(resolve => process.nextTick(resolve));
    expect(component.state('exactMatchedIndices')).toEqual([]);
  });
});
