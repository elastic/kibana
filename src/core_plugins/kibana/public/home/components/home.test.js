import React from 'react';
import { shallow } from 'enzyme';
import { Home } from './home';
import { FeatureCatalogueCategory } from 'ui/registry/feature_catalogue';

const addBasePath = (url) => { return `base_path/${url}`; };

test('should render home component', () => {
  const recentlyAccessed = [
    {
      label: 'my vis',
      link: 'link_to_my_vis',
      id: '1'
    }
  ];
  const component = shallow(<Home
    addBasePath={addBasePath}
    directories={[]}
    apmUiEnabled={true}
    recentlyAccessed={recentlyAccessed}
  />);
  expect(component).toMatchSnapshot(); // eslint-disable-line
});

test('should not contain RecentlyAccessed panel when there is no recentlyAccessed history', () => {
  const component = shallow(<Home
    addBasePath={addBasePath}
    directories={[]}
    apmUiEnabled={true}
    recentlyAccessed={[]}
  />);
  expect(component).toMatchSnapshot(); // eslint-disable-line
});

describe('directories', () => {
  test('should render DATA directory entry in "Explore Data" panel', () => {
    const directoryEntry = {
      id: 'dashboard',
      title: 'Dashboard',
      description: 'Display and share a collection of visualizations and saved searches.',
      icon: '/plugins/kibana/assets/app_dashboard.svg',
      path: 'dashboard_landing_page',
      showOnHomePage: true,
      category: FeatureCatalogueCategory.DATA
    };

    const component = shallow(<Home
      addBasePath={addBasePath}
      directories={[directoryEntry]}
      apmUiEnabled={true}
      recentlyAccessed={[]}
    />);
    expect(component).toMatchSnapshot(); // eslint-disable-line
  });

  test('should render ADMIN directory entry in "Manage" panel', () => {
    const directoryEntry = {
      id: 'index_patterns',
      title: 'Index Patterns',
      description: 'Manage the index patterns that help retrieve your data from Elasticsearch.',
      icon: '/plugins/kibana/assets/app_index_pattern.svg',
      path: 'index_management_landing_page',
      showOnHomePage: true,
      category: FeatureCatalogueCategory.ADMIN
    };

    const component = shallow(<Home
      addBasePath={addBasePath}
      directories={[directoryEntry]}
      apmUiEnabled={true}
      recentlyAccessed={[]}
    />);
    expect(component).toMatchSnapshot(); // eslint-disable-line
  });

  test('should not render directory entry when showOnHomePage is false', () => {
    const directoryEntry = {
      id: 'management',
      title: 'Management',
      description: 'Your center console for managing the Elastic Stack.',
      icon: '/plugins/kibana/assets/app_management.svg',
      path: 'management_landing_page',
      showOnHomePage: false,
      category: FeatureCatalogueCategory.ADMIN
    };

    const component = shallow(<Home
      addBasePath={addBasePath}
      directories={[directoryEntry]}
      apmUiEnabled={true}
      recentlyAccessed={[]}
    />);
    expect(component).toMatchSnapshot(); // eslint-disable-line
  });
});
