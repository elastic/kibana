/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import sinon from 'sinon';
import expect from '@kbn/expect';

import { UiApp } from '../ui_app';
import { UiNavLink } from '../../ui_nav_links';

function createStubUiAppSpec(extraParams) {
  return {
    id: 'uiapp-test',
    main: 'main.js',
    title: 'UIApp Test',
    order: 9000,
    icon: 'ui_app_test.svg',
    linkToLastSubUrl: true,
    hidden: false,
    listed: false,
    ...extraParams,
  };
}

function createStubKbnServer(extraParams) {
  return {
    plugins: [],
    config: {
      get: sinon
        .stub()
        .withArgs('server.basePath')
        .returns(''),
    },
    server: {},
    ...extraParams,
  };
}

function createUiApp(spec = createStubUiAppSpec(), kbnServer = createStubKbnServer()) {
  return new UiApp(kbnServer, spec);
}

describe('ui apps / UiApp', () => {
  describe('constructor', () => {
    it('throws an exception if an ID is not given', () => {
      const spec = {}; // should have id property
      expect(() => createUiApp(spec)).to.throwException();
    });

    describe('defaults', () => {
      const spec = { id: 'uiapp-test-defaults' };
      const app = createUiApp(spec);

      it('has the ID from the spec', () => {
        expect(app.getId()).to.be(spec.id);
      });

      it('has no plugin ID', () => {
        expect(app.getPluginId()).to.be(undefined);
      });

      it('is not hidden', () => {
        expect(app.isHidden()).to.be(false);
      });

      it('is listed', () => {
        expect(app.isListed()).to.be(true);
      });

      it('has a navLink', () => {
        expect(app.getNavLink()).to.be.a(UiNavLink);
      });

      it('has no main module', () => {
        expect(app.getMainModuleId()).to.be(undefined);
      });

      it('has a mostly empty JSON representation', () => {
        expect(JSON.parse(JSON.stringify(app))).to.eql({
          id: spec.id,
          navLink: {
            id: 'uiapp-test-defaults',
            order: 0,
            url: '/app/uiapp-test-defaults',
            subUrlBase: '/app/uiapp-test-defaults',
            linkToLastSubUrl: true,
            hidden: false,
            disabled: false,
            tooltip: '',
          },
        });
      });
    });

    describe('mock spec', () => {
      const spec = createStubUiAppSpec();
      const app = createUiApp(spec);

      it('has the ID from the spec', () => {
        expect(app.getId()).to.be(spec.id);
      });

      it('has no plugin ID', () => {
        expect(app.getPluginId()).to.be(undefined);
      });

      it('is not hidden', () => {
        expect(app.isHidden()).to.be(false);
      });

      it('is also not listed', () => {
        expect(app.isListed()).to.be(false);
      });

      it('has no navLink', () => {
        expect(app.getNavLink()).to.be(undefined);
      });

      it('has a main module', () => {
        expect(app.getMainModuleId()).to.be('main.js');
      });

      it('has spec values in JSON representation', () => {
        expect(JSON.parse(JSON.stringify(app))).to.eql({
          id: spec.id,
          title: spec.title,
          icon: spec.icon,
          main: spec.main,
          linkToLastSubUrl: spec.linkToLastSubUrl,
          navLink: {
            id: 'uiapp-test',
            title: 'UIApp Test',
            order: 9000,
            url: '/app/uiapp-test',
            subUrlBase: '/app/uiapp-test',
            icon: 'ui_app_test.svg',
            linkToLastSubUrl: true,
            hidden: false,
            disabled: false,
            tooltip: '',
          },
        });
      });
    });

    /*
     * The "hidden" and "listed" flags have an bound relationship. The "hidden"
     * flag gets cast to a boolean value, and the "listed" flag is dependent on
     * "hidden"
     */
    describe('hidden flag', () => {
      describe('is cast to boolean value', () => {
        it('when undefined', () => {
          const kbnServer = createStubKbnServer();
          const spec = {
            id: 'uiapp-test',
          };
          const newApp = new UiApp(kbnServer, spec);
          expect(newApp.isHidden()).to.be(false);
        });

        it('when null', () => {
          const kbnServer = createStubKbnServer();
          const spec = {
            id: 'uiapp-test',
            hidden: null,
          };
          const newApp = new UiApp(kbnServer, spec);
          expect(newApp.isHidden()).to.be(false);
        });

        it('when 0', () => {
          const kbnServer = createStubKbnServer();
          const spec = {
            id: 'uiapp-test',
            hidden: 0,
          };
          const newApp = new UiApp(kbnServer, spec);
          expect(newApp.isHidden()).to.be(false);
        });

        it('when true', () => {
          const kbnServer = createStubKbnServer();
          const spec = {
            id: 'uiapp-test',
            hidden: true,
          };
          const newApp = new UiApp(kbnServer, spec);
          expect(newApp.isHidden()).to.be(true);
        });

        it('when 1', () => {
          const kbnServer = createStubKbnServer();
          const spec = {
            id: 'uiapp-test',
            hidden: 1,
          };
          const newApp = new UiApp(kbnServer, spec);
          expect(newApp.isHidden()).to.be(true);
        });
      });
    });

    describe('listed flag', () => {
      describe('defaults to the opposite value of hidden', () => {
        it(`when it's null and hidden is true`, () => {
          const kbnServer = createStubKbnServer();
          const spec = {
            id: 'uiapp-test',
            hidden: true,
            listed: null,
          };
          const newApp = new UiApp(kbnServer, spec);
          expect(newApp.isListed()).to.be(false);
        });

        it(`when it's null and hidden is false`, () => {
          const kbnServer = createStubKbnServer();
          const spec = {
            id: 'uiapp-test',
            hidden: false,
            listed: null,
          };
          const newApp = new UiApp(kbnServer, spec);
          expect(newApp.isListed()).to.be(true);
        });

        it(`when it's undefined and hidden is false`, () => {
          const kbnServer = createStubKbnServer();
          const spec = {
            id: 'uiapp-test',
            hidden: false,
          };
          const newApp = new UiApp(kbnServer, spec);
          expect(newApp.isListed()).to.be(true);
        });

        it(`when it's undefined and hidden is true`, () => {
          const kbnServer = createStubKbnServer();
          const spec = {
            id: 'uiapp-test',
            hidden: true,
          };
          const newApp = new UiApp(kbnServer, spec);
          expect(newApp.isListed()).to.be(false);
        });
      });

      it(`is set to true when it's passed as true`, () => {
        const kbnServer = createStubKbnServer();
        const spec = {
          id: 'uiapp-test',
          listed: true,
        };
        const newApp = new UiApp(kbnServer, spec);
        expect(newApp.isListed()).to.be(true);
      });

      it(`is set to false when it's passed as false`, () => {
        const kbnServer = createStubKbnServer();
        const spec = {
          id: 'uiapp-test',
          listed: false,
        };
        const newApp = new UiApp(kbnServer, spec);
        expect(newApp.isListed()).to.be(false);
      });
    });
  });

  describe('pluginId', () => {
    describe('does not match a kbnServer plugin', () => {
      it('throws an error at instantiation', () => {
        expect(() => {
          createUiApp(createStubUiAppSpec({ pluginId: 'foo' }));
        }).to.throwException(error => {
          expect(error.message).to.match(/Unknown plugin id/);
        });
      });
    });
  });

  describe('#getMainModuleId', () => {
    it('returns undefined by default', () => {
      const app = createUiApp({ id: 'foo' });
      expect(app.getMainModuleId()).to.be(undefined);
    });

    it('returns main module id', () => {
      const app = createUiApp({ id: 'foo', main: 'bar' });
      expect(app.getMainModuleId()).to.be('bar');
    });
  });
});
