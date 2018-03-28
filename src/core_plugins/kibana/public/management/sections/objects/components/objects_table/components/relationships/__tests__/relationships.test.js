import React from 'react';
import { shallow } from 'enzyme';

import { Relationships } from '../relationships';

describe('Relationships', () => {
  it('should render index patterns normally', async () => {
    const props = {
      getRelationships: jest.fn().mockImplementation(() => ({
        searches: [
          {
            id: '1',
          }
        ],
        visualizations: [
          {
            id: '2',
          }
        ],
      })),
      id: '1',
      type: 'index-pattern',
      title: 'MyIndexPattern*',
      close: jest.fn(),
    };

    const component = shallow(
      <Relationships
        {...props}
      />
    );

    // Make sure we are showing loading
    expect(component.find('EuiLoadingKibana').length).toBe(1);

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(props.getRelationships).toHaveBeenCalled();
    expect(component).toMatchSnapshot();
  });

  it('should render searches normally', async () => {
    const props = {
      getRelationships: jest.fn().mockImplementation(() => ({
        indexPatterns: [
          {
            id: '1',
          }
        ],
        visualizations: [
          {
            id: '2',
          }
        ],
      })),
      id: '1',
      type: 'search',
      title: 'MySearch',
      close: jest.fn(),
    };

    const component = shallow(
      <Relationships
        {...props}
      />
    );

    // Make sure we are showing loading
    expect(component.find('EuiLoadingKibana').length).toBe(1);

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(props.getRelationships).toHaveBeenCalled();
    expect(component).toMatchSnapshot();
  });

  it('should render visualizations normally', async () => {
    const props = {
      getRelationships: jest.fn().mockImplementation(() => ({
        dashboards: [
          {
            id: '1',
          },
          {
            id: '2',
          }
        ],
      })),
      id: '1',
      type: 'visualization',
      title: 'MyViz',
      close: jest.fn(),
    };

    const component = shallow(
      <Relationships
        {...props}
      />
    );

    // Make sure we are showing loading
    expect(component.find('EuiLoadingKibana').length).toBe(1);

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(props.getRelationships).toHaveBeenCalled();
    expect(component).toMatchSnapshot();
  });

  it('should render dashboards normally', async () => {
    const props = {
      getRelationships: jest.fn().mockImplementation(() => ({
        visualizations: [
          {
            id: '1',
          },
          {
            id: '2',
          }
        ],
      })),
      id: '1',
      type: 'dashboard',
      title: 'MyDashboard',
      close: jest.fn(),
    };

    const component = shallow(
      <Relationships
        {...props}
      />
    );

    // Make sure we are showing loading
    expect(component.find('EuiLoadingKibana').length).toBe(1);

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(props.getRelationships).toHaveBeenCalled();
    expect(component).toMatchSnapshot();
  });

  it('should render errors', async () => {
    const props = {
      getRelationships: jest.fn().mockImplementation(() => {
        throw new Error('foo');
      }),
      id: '1',
      type: 'dashboard',
      title: 'MyDashboard',
      close: jest.fn(),
    };

    const component = shallow(
      <Relationships
        {...props}
      />
    );

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(props.getRelationships).toHaveBeenCalled();
    expect(component).toMatchSnapshot();
  });
});
