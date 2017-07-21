import expect from 'expect.js';
import UiApp from '../ui_app.js';
import UiExports from '../ui_exports';
import { noop } from 'lodash';

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

    it('throws an exception if an ID is not given', () => {
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

      it('copies the ID from the spec', () => {
        expect(newApp.id).to.be(spec.id);
      });

      it('has a built-in default navLink', () => {
        expect(newApp.navLink).to.eql({
          id: 'uiapp-test-defaults',
          title: undefined,
          order: 0,
          url: '/app/uiapp-test-defaults',
          subUrlBase: '/app/uiapp-test-defaults',
          description: undefined,
          icon: undefined,
          linkToLastSubUrl: true,
          hidden: false,
          disabled: false,
          tooltip: ''
        });
      });

      it('has a built-in default order of 0', () => {
        expect(newApp.order).to.be(0);
      });

      it('has a built-in default template name of ui_app', () => {
        expect(newApp.templateName).to.be('ui_app');
      });
    });

    describe('with spec', () => {
      const spec = getMockSpec();
      let newApp;
      beforeEach(() => {
        newApp = new UiApp(uiExports, spec);
      });

      it('copies the ID from the spec', () => {
        expect(newApp.id).to.be(spec.id);
      });

      it('copies field values from spec', () => {
        // test that the fields exist, but have undefined value
        expect(newApp.main).to.be(spec.main);
        expect(newApp.title).to.be(spec.title);
        expect(newApp.description).to.be(spec.description);
        expect(newApp.icon).to.be(spec.icon);
        expect(newApp.linkToLastSubUrl).to.be(spec.linkToLastSubUrl);
        expect(newApp.templateName).to.be(spec.templateName);
        expect(newApp.order).to.be(spec.order);
        expect(newApp.navLink).to.eql({
          id: 'uiapp-test',
          title: 'UIApp Test',
          order: 9000,
          url: '/app/uiapp-test',
          subUrlBase: '/app/uiapp-test',
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

      it('has a reference to the uiExports object', () => {
        expect(newApp.uiExports).to.be(uiExports);
      });

      it('has a reference to the original spec', () => {
        expect(newApp.spec).to.be(spec);
      });

      it('has a reference to the spec.injectVars function', () => {
        const helloFunction = () => 'hello';
        const spec = {
          id: 'uiapp-test',
          injectVars: helloFunction
        };
        const newApp = new UiApp(uiExports, spec);
        expect(newApp.getInjectedVars).to.be(helloFunction);
      });
    });

    describe('app.getInjectedVars', () => {
      it('is noop function by default', () => {
        const spec = {
          id: 'uiapp-test'
        };
        const newApp = new UiApp(uiExports, spec);
        expect(newApp.getInjectedVars).to.be(noop);
      });
    });

    describe('hidden and listed flags', () => {
      it('has hidden defaulted to false and listed defaulted to true', () => {
        const spec = {
          id: 'uiapp-test'
        };
        const newApp = new UiApp(uiExports, spec);
        expect(newApp.hidden).to.be(false);
        expect(newApp.listed).to.be(true);
      });

      it('has listed set to false if listed is passed as null and hidden is passed as true, ', () => {
        const spec = {
          id: 'uiapp-test',
          hidden: true,
          listed: null
        };
        const newApp = new UiApp(uiExports, spec);
        expect(newApp.hidden).to.be(true);
        expect(newApp.listed).to.be(false);
      });

      it('has listed set to true if listed is passed as null and hidden passed as false, ', () => {
        const spec = {
          id: 'uiapp-test',
          hidden: false,
          listed: null
        };
        const newApp = new UiApp(uiExports, spec);
        expect(newApp.hidden).to.be(false);
        expect(newApp.listed).to.be(true);
      });

      it('has listed set to true if listed is passed as null and hidden not passed', () => {
        const spec = {
          id: 'uiapp-test',
          listed: null
        };
        const newApp = new UiApp(uiExports, spec);
        expect(newApp.hidden).to.be(false);
        expect(newApp.listed).to.be(true);
      });

      it('has listed set to what it was passed as', () => {
        const spec = {
          id: 'uiapp-test',
          listed: true
        };
        const newApp = new UiApp(uiExports, spec);
        expect(newApp.hidden).to.be(false);
        expect(newApp.listed).to.be(true);

        const spec2 = {
          id: 'uiapp-test',
          listed: false
        };
        const newApp2 = new UiApp(uiExports, spec2);
        expect(newApp2.hidden).to.be(false);
        expect(newApp2.listed).to.be(false);
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
          subUrlBase: '/app/uiapp-test',
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
