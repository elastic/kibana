import expect from 'expect.js';

import UiNavLink from '../ui_nav_link';

describe('UiNavLink', () => {
  describe('#toJSON', () => {
    it ('returns the expected properties', () => {
      const uiExports = {
        urlBasePath: 'http://localhost:5601/rnd'
      };
      const spec = {
        id: 'kibana:discover',
        title: 'Discover',
        order: -1003,
        url: '/app/kibana#/discover',
        description: 'interactively explore your data',
        icon: 'plugins/kibana/assets/discover.svg',
      };
      const link = new UiNavLink(uiExports, spec);
      const json = link.toJSON();

      ['id', 'title', 'url', 'order', 'description', 'icon', 'linkToLastSubUrl'].forEach(expectedProperty => {
        expect(json).to.have.property(expectedProperty);
      });
    });
  });
});
