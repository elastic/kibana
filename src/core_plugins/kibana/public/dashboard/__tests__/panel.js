import expect from 'expect.js';
import ngMock from 'ng_mock';
import Promise from 'bluebird';
import sinon from 'sinon';
import noDigestPromise from 'test_utils/no_digest_promises';
import mockUiState from 'fixtures/mock_ui_state';

describe('dashboard panel', function () {
  let $scope;
  let $el;
  let parentScope;

  noDigestPromise.activateForSuite();

  function init(mockDocResponse) {
    ngMock.module('kibana');
    ngMock.inject(($rootScope, $compile, esAdmin) => {
      sinon.stub(esAdmin, 'mget').returns(Promise.resolve({ docs: [ mockDocResponse ] }));
      sinon.stub(esAdmin.indices, 'getFieldMapping').returns(Promise.resolve({
        '.kibana': {
          mappings: {
            visualization: {}
          }
        }
      }));

      parentScope = $rootScope.$new();
      parentScope.saveState = sinon.stub();
      parentScope.createChildUiState = sinon.stub().returns(mockUiState);
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
          get-vis-click-handler="getVisClickHandler"
          get-vis-brush-handler="getVisBrushHandler"
          save-state="saveState"
          register-panel-index-pattern="registerPanelIndexPattern"
          create-child-ui-state="createChildUiState">
        </dashboard-panel>`)(parentScope);
      $scope = $el.isolateScope();
      parentScope.$digest();
    });
  }

  afterEach(() => {
    $scope.$destroy();
    $el.remove();
  });

  it('should not visualize the visualization if it does not exist', function () {
    init({ found: false });
    return $scope.loadedPanel.then(() => {
      expect($scope.error).to.be('Could not locate that visualization (id: foo1)');
      parentScope.$digest();
      const content = $el.find('.panel-content');
      expect(content).to.have.length(0);
    });
  });

  it('should try to visualize the visualization if found', function () {
    init({ found: true, _source: {} });
    return $scope.loadedPanel.then(() => {
      expect($scope.error).not.to.be.ok();
      parentScope.$digest();
      const content = $el.find('.panel-content');
      expect(content).to.have.length(1);
    });
  });
});
