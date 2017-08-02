import expect from 'expect.js';
import ngMock from 'ng_mock';
import Promise from 'bluebird';
import sinon from 'sinon';
import noDigestPromise from 'test_utils/no_digest_promises';
import { DashboardContainerAPI } from '../dashboard_container_api';
import { DashboardState } from '../dashboard_state';
import { SavedObjectsClient } from 'ui/saved_objects';

describe('dashboard panel', function () {
  let $scope;
  let $el;
  let parentScope;
  let savedDashboard;
  let AppState;

  noDigestPromise.activateForSuite();

  function init(mockDocResponse) {
    ngMock.module('kibana');
    ngMock.inject(($rootScope, $compile, Private, $injector) => {
      const SavedDashboard = $injector.get('SavedDashboard');
      AppState = $injector.get('AppState');
      savedDashboard = new SavedDashboard();
      sinon.stub(SavedObjectsClient.prototype, 'get').returns(Promise.resolve(mockDocResponse));
      parentScope = $rootScope.$new();
      parentScope.saveState = sinon.stub();
      const dashboardState = new DashboardState(savedDashboard, AppState, false);
      parentScope.containerApi = new DashboardContainerAPI(dashboardState);
      parentScope.getVisClickHandler = sinon.stub();
      parentScope.getVisBrushHandler = sinon.stub();
      parentScope.registerPanelIndexPattern = sinon.stub();
      parentScope.panel = {
        col: 3,
        id: 'foo1',
        row: 1,
        size_x: 2,
        size_y: 2,
        type: 'visualization'
      };
      $el = $compile(`
        <dashboard-panel
          panel="panel"
          is-full-screen-mode="false"
          is-expanded="false"
          container-api="containerApi" 
         >
        </dashboard-panel>`)(parentScope);
      $scope = $el.isolateScope();
      parentScope.$digest();
    });
  }

  afterEach(() => {
    SavedObjectsClient.prototype.get.restore();
    $scope.$destroy();
    $el.remove();
  });

  it('should not visualize the visualization if it does not exist', function () {
    init({ found: false });
    return $scope.renderPromise.then(() => {
      expect($scope.error).to.be('Could not locate that visualization (id: foo1)');
      parentScope.$digest();
      const content = $el.find('.panel-content');
      expect(content.children().length).to.be(0);
    });
  });

  it('should try to visualize the visualization if found', function () {
    init({ id: 'foo1', type: 'visualization', _version: 2, attributes: {} });
    return $scope.renderPromise.then(() => {
      expect($scope.error).not.to.be.ok();
      parentScope.$digest();
      const content = $el.find('.panel-content');
      expect(content.children().length).to.be.greaterThan(0);
    });
  });
});
