import React from 'react';
import { shallow } from 'enzyme';

import { CreateIndexPatternWizard } from '../create_index_pattern_wizard';

jest.mock('../components/step_index_pattern', () => ({ StepIndexPattern: 'StepIndexPattern' }));
jest.mock('../components/step_time_field', () => ({ StepTimeField: 'StepTimeField' }));
jest.mock('../components/header', () => ({ Header: 'Header' }));
jest.mock('../components/loading_state', () => ({ LoadingState: 'LoadingState' }));
jest.mock('../components/empty_state', () => ({ EmptyState: 'EmptyState' }));
jest.mock('../lib/get_indices', () => ({
  getIndices: () => {
    return [
      { name: 'kibana' },
    ];
  },
}));

const loadingDataDocUrl = '';
const initialQuery = '';
const services = {
  es: {},
  indexPatterns: {},
  savedObjectsClient: {},
  config: {},
  changeUrl: () => {},
  scopeApply: () => {},
};

describe('CreateIndexPatternWizard', () => {
  it(`defaults to the loading state`, async () => {
    const component = shallow(
      <CreateIndexPatternWizard
        loadingDataDocUrl={loadingDataDocUrl}
        initialQuery={initialQuery}
        services={services}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('renders the empty state when there are no indices', async () => {
    const component = shallow(
      <CreateIndexPatternWizard
        loadingDataDocUrl={loadingDataDocUrl}
        initialQuery={initialQuery}
        services={services}
      />
    );

    component.setState({
      isInitiallyLoadingIndices: false,
      allIndices: [],
    });

    await component.update();
    expect(component).toMatchSnapshot();
  });

  it('renders index pattern step when there are indices', async () => {
    const component = shallow(
      <CreateIndexPatternWizard
        loadingDataDocUrl={loadingDataDocUrl}
        initialQuery={initialQuery}
        services={services}
      />
    );

    component.setState({
      isInitiallyLoadingIndices: false,
      allIndices: [{}],
    });

    await component.update();
    expect(component).toMatchSnapshot();
  });

  it('renders time field step when step is set to 2', async () => {
    const component = shallow(
      <CreateIndexPatternWizard
        loadingDataDocUrl={loadingDataDocUrl}
        initialQuery={initialQuery}
        services={services}
      />
    );

    component.setState({
      isInitiallyLoadingIndices: false,
      allIndices: [{}],
      step: 2,
    });

    await component.update();
    expect(component).toMatchSnapshot();
  });

  it('invokes the provided services when creating an index pattern', async () => {
    const get = jest.fn();
    const set = jest.fn();
    const create = jest.fn().mockImplementation(() => 'id');
    const clear = jest.fn();
    const changeUrl = jest.fn();

    const component = shallow(
      <CreateIndexPatternWizard
        loadingDataDocUrl={loadingDataDocUrl}
        initialQuery={initialQuery}
        services={{
          ...services,
          config: { get, set },
          indexPatterns: {
            get: () => ({
              create,
            }),
            cache: { clear }
          },
          changeUrl,
        }}
      />
    );

    component.setState({ indexPattern: 'foo' });
    await component.instance().createIndexPattern(null, 'id');
    expect(get).toBeCalled();
    expect(create).toBeCalled();
    expect(clear).toBeCalledWith('id');
    expect(changeUrl).toBeCalledWith(`/management/kibana/indices/id`);
  });
});
