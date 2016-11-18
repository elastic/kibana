import expect from 'expect.js';
import UiApp from '../ui_app.js';
import UiExports from '../ui_exports';
import { isUndefined, noop } from 'lodash';

function getMockSpec(extraParams) {
  return {
    id: 'uiapp-test',
    main: 'main.js',
    title: 'UIApp Test',
    order: 9000,
    description: 'Test of UI App Constructor',
    icon: 'ui_app_test.svg',
    linkToLastSubUrl: true,
    hidden: false,
    listed: null,
    templateName: 'ui_app_test',
    ...extraParams
  };
}
describe('UiApp', () => {
  describe('constructor', () => {
    const uiExports = new UiExports({});

    it('throw if ID is not given', () => {
      function newAppMissingID() {
        const spec = {}; // should have id property
        const newApp = new UiApp(uiExports, spec);
        return newApp;
      }
      expect(newAppMissingID).to.throwException();
    });

    describe('defaults', () => {
      const spec = { id: 'uiapp-test-defaults' };
      let newApp;
      beforeEach(() => {
        newApp = new UiApp(uiExports, spec);
      });

      it('use the spec ID', () => {
        expect(newApp.id).to.be('uiapp-test-defaults');
      });

      it('creates fields with undefined value', () => {
        // test that the fields exist, but have undefined value
        expect('main' in newApp).to.be(true);
        expect(isUndefined(newApp.main)).to.be(true);

        expect('title' in newApp).to.be(true);
        expect(isUndefined(newApp.title)).to.be(true);

        expect('description' in newApp).to.be(true);
        expect(isUndefined(newApp.description)).to.be(true);

        expect('icon' in newApp).to.be(true);
        expect(isUndefined(newApp.icon)).to.be(true);

        expect('linkToLastSubUrl' in newApp).to.be(true);
        expect(isUndefined(newApp.linkToLastSubUrl)).to.be(true);
      });

      it('default navLink', () => {
        expect(newApp.navLink).to.eql({
          id: 'uiapp-test-defaults',
          title: undefined,
          order: 0,
          url: '/app/uiapp-test-defaults',
          description: undefined,
          icon: undefined,
          linkToLastSubUrl: true,
          hidden: false,
          disabled: false,
          tooltip: ''
        });
      });

      it('default order of 0', () => {
        expect(newApp.order).to.be(0);
      });

      it('template name is ui_app', () => {
        expect(newApp.templateName).to.be('ui_app');
      });
    });

    describe('with spec', () => {
      const spec = getMockSpec();
      let newApp;
      beforeEach(() => {
        newApp = new UiApp(uiExports, spec);
      });

      it('use the spec ID', () => {
        expect(newApp.id).to.be('uiapp-test');
      });

      it('copies field values from spec', () => {
        // test that the fields exist, but have undefined value
        expect(newApp.main).to.be('main.js');
        expect(newApp.title).to.be('UIApp Test');
        expect(newApp.description).to.be('Test of UI App Constructor');
        expect(newApp.icon).to.be('ui_app_test.svg');
        expect(newApp.linkToLastSubUrl).to.be(true);
        expect(newApp.templateName).to.be('ui_app_test');
        expect(newApp.order).to.be(9000);
        expect(newApp.navLink).to.eql({
          id: 'uiapp-test',
          title: 'UIApp Test',
          order: 9000,
          url: '/app/uiapp-test',
          description: 'Test of UI App Constructor',
          icon: 'ui_app_test.svg',
          linkToLastSubUrl: true,
          hidden: false,
          disabled: false,
          tooltip: ''
        });
      });
    });

    describe('reference fields', () => {
      const spec = getMockSpec({ testSpec: true });
      let newApp;
      beforeEach(() => {
        newApp = new UiApp(uiExports, spec);
      });

      it('uiExports', () => {
        expect(newApp.uiExports).to.be(uiExports);
      });
      it('spec', () => {
        expect(newApp.spec).to.be(spec);
      });
    });

    describe('getInjectedVars', () => {
      it('noop function by default', () => {
        const spec = {
          id: 'uiapp-test'
        };
        const newApp = new UiApp(uiExports, spec);
        expect(newApp.getInjectedVars).to.be(noop);
      });
      it('reference to spec.injectVars', () => {
        const helloFunction = () => 'hello';
        const spec = {
          id: 'uiapp-test',
          injectVars: helloFunction
        };
        const newApp = new UiApp(uiExports, spec);
        expect(newApp.getInjectedVars).to.be(helloFunction);
      });
    });

    describe('hidden and listed', () => {
      it('if hidden and listed are not set, hidden is set as false and listed is set as true', () => {
        const spec = {
          id: 'uiapp-test'
        };
        const newApp = new UiApp(uiExports, spec);
        expect(newApp.hidden).to.be(false);
        expect(newApp.listed).to.be(true);
      });
      it('if listed is passed as null, and hidden is true, listed is set as false', () => {
        const spec = {
          id: 'uiapp-test',
          hidden: true,
          listed: null
        };
        const newApp = new UiApp(uiExports, spec);
        expect(newApp.hidden).to.be(true);
        expect(newApp.listed).to.be(false);
      });
      it('if listed is passed as null, and hidden is false, listed is set as true', () => {
        const spec = {
          id: 'uiapp-test',
          hidden: false,
          listed: null
        };
        const newApp = new UiApp(uiExports, spec);
        expect(newApp.hidden).to.be(false);
        expect(newApp.listed).to.be(true);
      });
      it('if listed is passed as null, and hidden not set, listed is set as true', () => {
        const spec = {
          id: 'uiapp-test',
          listed: null
        };
        const newApp = new UiApp(uiExports, spec);
        expect(newApp.hidden).to.be(false);
        expect(newApp.listed).to.be(true);
      });
      it('if listed is passed as true, is set with that value', () => {
        const spec = {
          id: 'uiapp-test',
          listed: true
        };
        const newApp = new UiApp(uiExports, spec);
        expect(newApp.hidden).to.be(false);
        expect(newApp.listed).to.be(true);
      });
      it('if listed is passed as false, is set with that value', () => {
        const spec = {
          id: 'uiapp-test',
          listed: false
        };
        const newApp = new UiApp(uiExports, spec);
        expect(newApp.hidden).to.be(false);
        expect(newApp.listed).to.be(false);
      });
    });
  });

  describe('getModules', () => {
    it('gets modules from uiExports', () => {
      const uiExports = new UiExports({});
      uiExports.consumePlugin({
        uiExportsSpecs: {
          chromeNavControls: [ 'plugins/ui_app_test/views/nav_control' ],
          hacks: [ 'plugins/ui_app_test/hacks/init' ]
        }
      });
      const spec = getMockSpec();
      const newApp = new UiApp(uiExports, spec);

      expect(newApp.getModules()).to.eql([
        'main.js',
        'plugins/ui_app_test/views/nav_control',
        'plugins/ui_app_test/hacks/init'
      ]);
    });
  });

  describe('toJSON', function () {
    it('creates plain object', () => {
      const uiExports = new UiExports({});
      const spec = getMockSpec();
      const newApp = new UiApp(uiExports, spec);

      expect(newApp.toJSON()).to.eql({
        id: 'uiapp-test',
        title: 'UIApp Test',
        description: 'Test of UI App Constructor',
        icon: 'ui_app_test.svg',
        main: 'main.js',
        navLink: {
          id: 'uiapp-test',
          title: 'UIApp Test',
          order: 9000,
          url: '/app/uiapp-test',
          description: 'Test of UI App Constructor',
          icon: 'ui_app_test.svg',
          linkToLastSubUrl: true,
          hidden: false,
          disabled: false,
          tooltip: ''
        },
        linkToLastSubUrl: true
      });
    });
  });
});
