import expect from 'expect.js';
import UiApp from '../ui_app.js';
import UiExports from '../ui_exports';

function getMockSpec() {
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
  };
}
describe('UiApp', () => {
  describe('constructor', () => {
    it('throw if ID is not given', () => {
      function newAppMissingID() {
        const uiExports = new UiExports({});
        const spec = {}; // should have id property
        const newApp = new UiApp(uiExports, spec);
        return newApp;
      }
      expect(newAppMissingID).to.throwException();
    });

    it('successful construction with defaults', () => {
      const uiExports = new UiExports({});
      const spec = { id: 'uiapp-test' };
      const newApp = new UiApp(uiExports, spec);

      expect(newApp.uiExports).to.be.an('object');
      expect(newApp.navLink).to.be.an('object');
      expect(newApp.getModules).to.be.a('function');
      expect(newApp.getInjectedVars).to.be.an('function');

      expect(newApp.spec).to.be.an('object');
      expect(newApp.id).to.be('uiapp-test');

      expect(newApp.main).to.be(undefined);
      expect(newApp.title).to.be(undefined);
      expect(newApp.order).to.be(0);
      expect(newApp.description).to.be(undefined);
      expect(newApp.icon).to.be(undefined);
      expect(newApp.linkToLastSubUrl).to.be(undefined);
      expect(newApp.hidden).to.be(false);
      expect(newApp.listed).to.be(true);
      expect(newApp.templateName).to.be('ui_app');
    });

    it('successful construction with spec', () => {
      const uiExports = new UiExports({});
      const spec = getMockSpec();
      const newApp = new UiApp(uiExports, spec);

      expect(newApp.uiExports).to.be.an('object');
      expect(newApp.navLink).to.be.an('object');
      expect(newApp.getModules).to.be.a('function');
      expect(newApp.getInjectedVars).to.be.an('function');

      expect(newApp.spec).to.be.an('object');
      expect(newApp.id).to.be('uiapp-test');

      expect(newApp.main).to.be('main.js');
      expect(newApp.title).to.be('UIApp Test');
      expect(newApp.order).to.be(9000);
      expect(newApp.description).to.be('Test of UI App Constructor');
      expect(newApp.icon).to.be('ui_app_test.svg');
      expect(newApp.linkToLastSubUrl).to.be(true);
      expect(newApp.hidden).to.be(false);
      expect(newApp.listed).to.be(true);
      expect(newApp.templateName).to.be('ui_app_test');
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
