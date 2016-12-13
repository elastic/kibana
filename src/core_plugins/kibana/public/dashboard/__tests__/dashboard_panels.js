import angular from 'angular';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import 'plugins/kibana/dashboard/services/_saved_dashboard';
import { DEFAULT_PANEL_WIDTH, DEFAULT_PANEL_HEIGHT } from '../components/panel/lib/panel_state';

describe('dashboard panels', function () {
  let $scope;
  let $el;

  function compile(dashboard) {
    ngMock.inject(($rootScope, $controller, $compile, $route) => {
      $scope = $rootScope.$new();
      $route.current = {
        locals: {
          dash: dashboard
        }
      };

      $el = angular.element(`
        <dashboard-app>
          <dashboard-grid style="width: 600px; height: 600px;"></dashboard-grid>
        </dashboard-app>`);
      $compile($el)($scope);
      $scope.$digest();
    });
  };

  function findPanelWithVisualizationId(id) {
    return $scope.state.panels.find((panel) => { return panel.id === id; });
  }

  beforeEach(() => {
    ngMock.module('kibana');
  });

  afterEach(() => {
    $scope.$destroy();
    $el.remove();
  });

  it('loads with no vizualizations', function () {
    ngMock.inject((SavedDashboard) => {
      let dash = new SavedDashboard();
      dash.init();
      compile(dash);
    });
    expect($scope.state.panels.length).to.be(0);
  });

  it('loads one vizualization', function () {
    ngMock.inject((SavedDashboard) => {
      let dash = new SavedDashboard();
      dash.init();
      dash.panelsJSON = `[{"col":3,"id":"foo1","row":1,"size_x":2,"size_y":2,"type":"visualization"}]`;
      compile(dash);
    });
    expect($scope.state.panels.length).to.be(1);
  });

  it('loads vizualizations in correct order', function () {
    ngMock.inject((SavedDashboard) => {
      let dash = new SavedDashboard();
      dash.init();
      dash.panelsJSON = `[
        {"col":3,"id":"foo1","row":1,"size_x":2,"size_y":2,"type":"visualization"},
        {"col":5,"id":"foo2","row":1,"size_x":2,"size_y":2,"type":"visualization"},
        {"col":9,"id":"foo3","row":1,"size_x":2,"size_y":2,"type":"visualization"},
        {"col":11,"id":"foo4","row":1,"size_x":2,"size_y":2,"type":"visualization"},
        {"col":1,"id":"foo5","row":1,"size_x":2,"size_y":2,"type":"visualization"},
        {"col":7,"id":"foo6","row":1,"size_x":2,"size_y":2,"type":"visualization"},
        {"col":4,"id":"foo7","row":6,"size_x":3,"size_y":2,"type":"visualization"},
        {"col":1,"id":"foo8","row":8,"size_x":3,"size_y":2,"type":"visualization"},
        {"col":10,"id":"foo9","row":8,"size_x":3,"size_y":2,"type":"visualization"},
        {"col":10,"id":"foo10","row":6,"size_x":3,"size_y":2,"type":"visualization"},
        {"col":4,"id":"foo11","row":8,"size_x":3,"size_y":2,"type":"visualization"},
        {"col":7,"id":"foo12","row":8,"size_x":3,"size_y":2,"type":"visualization"},
        {"col":1,"id":"foo13","row":6,"size_x":3,"size_y":2,"type":"visualization"},
        {"col":7,"id":"foo14","row":6,"size_x":3,"size_y":2,"type":"visualization"},
        {"col":5,"id":"foo15","row":3,"size_x":6,"size_y":3,"type":"visualization"},
        {"col":1,"id":"foo17","row":3,"size_x":4,"size_y":3,"type":"visualization"}]`;
      compile(dash);
    });
    expect($scope.state.panels.length).to.be(16);
    const foo8Panel = findPanelWithVisualizationId('foo8');
    expect(foo8Panel).to.not.be(null);
    expect(foo8Panel.row).to.be(8);
    expect(foo8Panel.col).to.be(1);
  });

  it('initializes visualizations with the default size', function () {
    ngMock.inject((SavedDashboard) => {
      let dash = new SavedDashboard();
      dash.init();
      dash.panelsJSON = `[
        {"col":3,"id":"foo1","row":1,"type":"visualization"},
        {"col":5,"id":"foo2","row":1,"size_x":5,"size_y":9,"type":"visualization"}]`;
      compile(dash);
    });
    expect($scope.state.panels.length).to.be(2);
    const foo1Panel = findPanelWithVisualizationId('foo1');
    expect(foo1Panel).to.not.be(null);
    expect(foo1Panel.size_x).to.be(DEFAULT_PANEL_WIDTH);
    expect(foo1Panel.size_y).to.be(DEFAULT_PANEL_HEIGHT);

    const foo2Panel = findPanelWithVisualizationId('foo2');
    expect(foo2Panel).to.not.be(null);
    expect(foo2Panel.size_x).to.be(5);
    expect(foo2Panel.size_y).to.be(9);
  });
});
