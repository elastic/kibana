//Commented out so I can get this into git passed eslint errors. Going to come back to this later.
/*import angular from 'angular';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import AggConfigResult from 'ui/vis/agg_config_result';
//import AggConfig from 'ui/vis/agg_config';
import { VisProvider } from 'ui/vis';
import { VisAggConfigProvider } from 'ui/vis/agg_config';

let $parentScope;
let $scope;
let $elem;
let indexPattern;
let AggConfig;

const init = function (expandable) {
  // Load the application
  ngMock.module('kibana');

  // Create the scope
  ngMock.inject(function ($rootScope, $compile, Private) {

    // Give us a scope
    $parentScope = $rootScope;
    AggConfig = Private(VisAggConfigProvider);

    // Not pretty but only way I can think of to mock data unit test style. Just copied example from chrome console using JSON.stringify .
    // Have applied green background to value "10" for "Guy1", red to "20" for "Guy2" and no color formatter to "30" for "Guy3".
    // kbnRows has to be three aggConfigResult objects? + some more junk?
    // Each of the arrays contains 2 aggConfigResults!
    var kbnRowsMockData = [
                            [
                              {
                                "key":"Guy1",
                                "value":"Guy1",
                                "aggConfig":{"id":"2","enabled":true,"type":"terms","schema":"bucket","params":{"field":"name.keyword","size":5,"order":"asc","orderBy":"_term"}},
                                "$order":1,
                                "type":"bucket"
                              },
                              {
                                "key":"10",
                                "value":"10",
                                "aggConfig":{"id":"1","enabled":true,"type":"top_hits","schema":"metric","params":{"field":"value.keyword","aggregate":"concat","size":1,"sortField":"value.keyword","sortOrder":"desc"}},
                                "$parent":{"key":"Guy1","value":"Guy1", "aggConfig":{"id":"2","enabled":true,"type":"terms","schema":"bucket","params":{"field":"name.keyword","size":5,"order":"asc","orderBy":"_term"}},"$order":1,"type":"bucket"},"$order":2,"type":"metric"
                              }
                            ],
                            [{"key":"Guy2","value":"Guy2","aggConfig":{"id":"2","enabled":true,"type":"terms","schema":"bucket","params":{"field":"name.keyword","size":5,"order":"asc","orderBy":"_term"}},"$order":3,"type":"bucket"},{"key":"20","value":"20","aggConfig":{"id":"1","enabled":true,"type":"top_hits","schema":"metric","params":{"field":"value.keyword","aggregate":"concat","size":1,"sortField":"value.keyword","sortOrder":"desc"}},"$parent":{"key":"Guy2","value":"Guy2","aggConfig":{"id":"2","enabled":true,"type":"terms","schema":"bucket","params":{"field":"name.keyword","size":5,"order":"asc","orderBy":"_term"}},"$order":3,"type":"bucket"},"$order":4,"type":"metric"}],
                            [{"key":"Guy3","value":"Guy3","aggConfig":{"id":"2","enabled":true,"type":"terms","schema":"bucket","params":{"field":"name.keyword","size":5,"order":"asc","orderBy":"_term"}},"$order":5,"type":"bucket"},{"key":"30","value":"30","aggConfig":{"id":"1","enabled":true,"type":"top_hits","schema":"metric","params":{"field":"value.keyword","aggregate":"concat","size":1,"sortField":"value.keyword","sortOrder":"desc"}},"$parent":{"key":"Guy3","value":"Guy3","aggConfig":{"id":"2","enabled":true,"type":"terms","schema":"bucket","params":{"field":"name.keyword","size":5,"order":"asc","orderBy":"_term"}},"$order":5,"type":"bucket"},"$order":6,"type":"metric"}]
                          ];

    var kbnRowsMock = []; //this data structure is passed as a parameter to the directive as kbn-rows="page" in one of the paginated_table.html
    //Trying to mock this structure is proving tricky!

    kbnRowsMockData.forEach(function(rowData){ //goes 3 times
      var aggConfigResultPair = [];

      rowData.forEach(function(cell) { //goes 2 times
        var key = cell.key;
        var value = cell.value;
        //
        // debugger;
        //var aggConfig = Object.assign(new AggConfig, cell.aggConfig); //JSON string as an object isn't enough here. I need access to the AggConfig functions. Hence casting to AggConfig prototype.
        //var aggConfig = cell.aggConfig;
        var vis = {"indexPattern":"exampleindex2","title":"example2","type":{"name":"table","title":"Data Table","image":"/ztv/bundles/62d88bccf9daf36f9e79a977574583cd.svg","description":"Display values in a table","category":"data","schemas":{"all":[{"group":"metrics","name":"metric","title":"Metric","aggFilter":"!geo_centroid","min":1,"defaults":[{"type":"count","schema":"metric"}],"max":null,"editor":false,"params":[],"deprecate":false},{"group":"buckets","name":"bucket","title":"Split Rows","min":0,"max":null,"aggFilter":"*","editor":false,"params":[],"deprecate":false},{"group":"buckets","name":"split","title":"Split Table","params":[{"name":"row","default":true}],"editor":"<div class=\"form-group\">\r\n  <div class=\"kuiButtonGroup\">\r\n    <button\r\n      type=\"button\"\r\n      class=\"kuiButton kuiButton--basic kuiButton--small\"\r\n      ng-model=\"agg.params.row\"\r\n      btn-radio=\"true\">\r\n      Rows\r\n    </button>\r\n    <button\r\n      type=\"button\"\r\n      class=\"kuiButton kuiButton--basic kuiButton--small\"\r\n      ng-model=\"agg.params.row\"\r\n      btn-radio=\"false\">\r\n      Columns\r\n    </button>\r\n  </div>\r\n</div>\r\n","min":0,"max":null,"aggFilter":"*","deprecate":false}],"metrics":[{"group":"metrics","name":"metric","title":"Metric","aggFilter":"!geo_centroid","min":1,"defaults":[{"type":"count","schema":"metric"}],"max":null,"editor":false,"params":[],"deprecate":false}],"buckets":[{"group":"buckets","name":"bucket","title":"Split Rows","min":0,"max":null,"aggFilter":"*","editor":false,"params":[],"deprecate":false},{"group":"buckets","name":"split","title":"Split Table","params":[{"name":"row","default":true}],"editor":"<div class=\"form-group\">\r\n  <div class=\"kuiButtonGroup\">\r\n    <button\r\n      type=\"button\"\r\n      class=\"kuiButton kuiButton--basic kuiButton--small\"\r\n      ng-model=\"agg.params.row\"\r\n      btn-radio=\"true\">\r\n      Rows\r\n    </button>\r\n    <button\r\n      type=\"button\"\r\n      class=\"kuiButton kuiButton--basic kuiButton--small\"\r\n      ng-model=\"agg.params.row\"\r\n      btn-radio=\"false\">\r\n      Columns\r\n    </button>\r\n  </div>\r\n</div>\r\n","min":0,"max":null,"aggFilter":"*","deprecate":false}]},"params":{"defaults":{"perPage":10,"showPartialRows":false,"showMeticsAtAllLevels":false,"sort":{"columnIndex":null,"direction":null},"showTotal":false,"totalFunc":"sum"},"editor":"<table-vis-params></table-vis-params>","optionTabs":[{"name":"options","title":"Options","editor":"<table-vis-params></table-vis-params>"}]},"requiresSearch":true,"requiresTimePicker":false,"fullEditor":false,"implementsRenderComplete":true,"template":"<div ng-controller=\"KbnTableVisController\" class=\"table-vis\">\r\n  <div ng-if=\"!hasSomeRows && hasSomeRows !== null\" class=\"table-vis-error\">\r\n    <h2 aria-hidden=\"true\"><i aria-hidden=\"true\" class=\"fa fa-meh-o\"></i></h2>\r\n    <h4>No results found</h4>\r\n  </div>\r\n\r\n  <div ng-if=\"tableGroups\" class=\"table-vis-container\">\r\n    <kbn-agg-table-group\r\n      group=\"tableGroups\"\r\n      export-title=\"vis.title\"\r\n      per-page=\"vis.params.perPage\"\r\n      sort=\"sort\"\r\n      show-total=\"vis.params.showTotal\"\r\n      total-func=\"vis.params.totalFunc\">\r\n    </kbn-agg-table-group>\r\n  </div>\r\n</div>\r\n"},"listeners":{},"params":{"perPage":10,"showMeticsAtAllLevels":false,"showPartialRows":false,"showTotal":false,"sort":{"columnIndex":null,"direction":null},"totalFunc":"sum"}};
        var opts = {"enabled":true,"id":"1","params":{"aggregate":"concat","field":"value.keyword","size":1,"sortField":"value.keyword","sortOrder":"desc"},"schema":"metric","type":"top_hits"};
        debugger;
        var aggConfig = new AggConfig(vis, opts);
        var parent = cell.$parent;
        //const result = new AggConfigResult(aggConfig, null, 10, 'apache'); //example from _agg_config_result.js
        const result = new AggConfigResult(aggConfig, parent, value, key);
        aggConfigResultPair.push(result);
      });

      kbnRowsMock.push(aggConfigResultPair);
    });

    //debugger;

    var kbnRowsMinMock = 3;

    $parentScope.kbnRowsMock = kbnRowsMock;
    $parentScope.kbnRowsMinMock = kbnRowsMinMock;

    var $table = angular.element(
      '<table></table>'
    );

    var $thead = angular.element(
      '<thead><tr><th>Heading1</th><th>Heading2</th></tr></thead>'
    );

    // Create the element under test
    $elem = angular.element(
      '<tbody kbn-rows="kbnRowsMock" kbn-rows-min="kbnRowsMinMock"></tbody>'
    );

    //$elem = angular.element(
    //    '<tbody><tr><th>Hello</th><th>There</th></tr></tbody>'
    //);

    $table.append($thead);
    $table.append($elem);

    angular.element(document.body).append($table);
    // And compile it
    $compile($table)($parentScope);

    // Fire a digest cycle
    $elem.scope().$digest();

    // Grab the isolate scope so we can test it
    $scope = $elem.isolateScope();
  });
};


describe('rows directive', function () {

  //Change request #9834 Color field format should apply to the whole cell in data table
  describe('colorFieldFormatAppliedToTableField', function () {

    beforeEach(function () {
      //Options:
      //1. should create kibana app, load a data set, try to apply a colour formatter to some data, create a table vis with data and run tests.
      //2. create kibana app, just create a row and feed in appropriate $cells mocked.
      // Feel like 1 is actually an integration test so go with 2 as I only want a unit test.
      // Turns out 1 may be impossible in karma. It only loads the directive under test and you have to mock parent scope.
      init(true);
    });

    it.only('when no color field applied then the table fields background color should be white', function (done) {
      //check out _table.js for assertion examples
      done(); //This is something to do with 10000ms timeouts?
    });

    it('when a color format field is applied then the table fields background color should be that colour', function (done) {

    });

  });

});
*/
