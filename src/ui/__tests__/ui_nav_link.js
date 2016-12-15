import expect from 'expect.js';

import UiNavLink from '../ui_nav_link';

describe('UiNavLink', () => {
  describe('constructor', () => {
    it ('initializes the object properties as expected', () => {
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
        hidden: true,
        disabled: true
      };
      const link = new UiNavLink(uiExports, spec);

      expect(link.id).to.be(spec.id);
      expect(link.title).to.be(spec.title);
      expect(link.order).to.be(spec.order);
      expect(link.url).to.be(`${uiExports.urlBasePath}${spec.url}`);
      expect(link.description).to.be(spec.description);
      expect(link.icon).to.be(spec.icon);
      expect(link.hidden).to.be(spec.hidden);
      expect(link.disabled).to.be(spec.disabled);
    });

    it ('initializes the url property without a base path when one is not specified in the spec', () => {
      const uiExports = {};
      const spec = {
        id: 'kibana:discover',
        title: 'Discover',
        order: -1003,
        url: '/app/kibana#/discover',
        description: 'interactively explore your data',
        icon: 'plugins/kibana/assets/discover.svg',
      };
      const link = new UiNavLink(uiExports, spec);

      expect(link.url).to.be(spec.url);
    });

    it ('initializes the order property to 0 when order is not specified in the spec', () => {
      const uiExports = {};
      const spec = {
        id: 'kibana:discover',
        title: 'Discover',
        url: '/app/kibana#/discover',
        description: 'interactively explore your data',
        icon: 'plugins/kibana/assets/discover.svg',
      };
      const link = new UiNavLink(uiExports, spec);

      expect(link.order).to.be(0);
    });

    it ('initializes the linkToLastSubUrl property to false when false is specified in the spec', () => {
      const uiExports = {};
      const spec = {
        id: 'kibana:discover',
        title: 'Discover',
        order: -1003,
        url: '/app/kibana#/discover',
        description: 'interactively explore your data',
        icon: 'plugins/kibana/assets/discover.svg',
        linkToLastSubUrl: false
      };
      const link = new UiNavLink(uiExports, spec);

      expect(link.linkToLastSubUrl).to.be(false);
    });

    it ('initializes the linkToLastSubUrl property to true by default', () => {
      const uiExports = {};
      const spec = {
        id: 'kibana:discover',
        title: 'Discover',
        order: -1003,
        url: '/app/kibana#/discover',
        description: 'interactively explore your data',
        icon: 'plugins/kibana/assets/discover.svg',
      };
      const link = new UiNavLink(uiExports, spec);

      expect(link.linkToLastSubUrl).to.be(true);
    });

    it ('initializes the hidden property to false by default', () => {
      const uiExports = {};
      const spec = {
        id: 'kibana:discover',
        title: 'Discover',
        order: -1003,
        url: '/app/kibana#/discover',
        description: 'interactively explore your data',
        icon: 'plugins/kibana/assets/discover.svg',
      };
      const link = new UiNavLink(uiExports, spec);

      expect(link.hidden).to.be(false);
    });

    it ('initializes the disabled property to false by default', () => {
      const uiExports = {};
      const spec = {
        id: 'kibana:discover',
        title: 'Discover',
        order: -1003,
        url: '/app/kibana#/discover',
        description: 'interactively explore your data',
        icon: 'plugins/kibana/assets/discover.svg',
      };
      const link = new UiNavLink(uiExports, spec);

      expect(link.disabled).to.be(false);
    });

    it ('initializes the tooltip property to an empty string by default', () => {
      const uiExports = {};
      const spec = {
        id: 'kibana:discover',
        title: 'Discover',
        order: -1003,
        url: '/app/kibana#/discover',
        description: 'interactively explore your data',
        icon: 'plugins/kibana/assets/discover.svg',
      };
      const link = new UiNavLink(uiExports, spec);

      expect(link.tooltip).to.be('');
    });
  });

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

      ['id', 'title', 'url', 'order', 'description', 'icon', 'linkToLastSubUrl', 'hidden', 'disabled', 'tooltip']
      .forEach(expectedProperty => expect(json).to.have.property(expectedProperty));
    });
  });
});
