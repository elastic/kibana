import expect from 'expect.js';
import ngMock from 'ng_mock';
import { AggTypesIndexProvider } from 'ui/agg_types/index';

describe('Terms Agg', function () {
  describe('order agg editor UI', function () {

    let $rootScope;

    function init({ responseValueAggs = [], aggParams = {} }) {
      ngMock.module('kibana');
      ngMock.inject(function (Private, $controller, _$rootScope_) {
        const terms = Private(AggTypesIndexProvider).byName.terms;
        const orderAggController = terms.params.byName.orderAgg.controller;

        $rootScope = _$rootScope_;
        $rootScope.agg = {
          id: 'test',
          params: aggParams,
          type: terms,
          vis: {
            aggs: []
          }
        };
        $rootScope.responseValueAggs = responseValueAggs;
        $controller(orderAggController, { $scope: $rootScope });
        $rootScope.$digest();
      });
    }

    it('defaults to the first metric agg', function () {
      init({
        responseValueAggs: [
          {
            id: 'agg1',
            type: {
              name: 'count'
            }
          },
          {
            id: 'agg2',
            type: {
              name: 'count'
            }
          }
        ]
      });
      expect($rootScope.agg.params.orderBy).to.be('agg1');
    });

    it('defaults to the first metric agg that is compatible with the terms bucket', function () {
      init({
        responseValueAggs: [
          {
            id: 'agg1',
            type: {
              name: 'top_hits'
            }
          },
          {
            id: 'agg2',
            type: {
              name: 'percentiles'
            }
          },
          {
            id: 'agg3',
            type: {
              name: 'median'
            }
          },
          {
            id: 'agg4',
            type: {
              name: 'std_dev'
            }
          },
          {
            id: 'agg5',
            type: {
              name: 'count'
            }
          }
        ]
      });
      expect($rootScope.agg.params.orderBy).to.be('agg5');
    });

    it('defaults to the _term metric if no agg is compatible', function () {
      init({
        responseValueAggs: [
          {
            id: 'agg1',
            type: {
              name: 'top_hits'
            }
          }
        ]
      });
      expect($rootScope.agg.params.orderBy).to.be('_term');
    });

    it('selects _term if there are no metric aggs', function () {
      init({});
      expect($rootScope.agg.params.orderBy).to.be('_term');
    });

    it('selects _term if the selected metric becomes incompatible', function () {
      init({
        responseValueAggs: [
          {
            id: 'agg1',
            type: {
              name: 'count'
            }
          }
        ]
      });
      expect($rootScope.agg.params.orderBy).to.be('agg1');
      $rootScope.responseValueAggs = [
        {
          id: 'agg1',
          type: {
            name: 'top_hits'
          }
        }
      ];
      $rootScope.$digest();
      expect($rootScope.agg.params.orderBy).to.be('_term');
    });

    it('selects first metric if it is avg', function () {
      init({
        responseValueAggs: [
          {
            id: 'agg1',
            type: {
              name: 'avg',
              field: 'bytes'
            }
          }
        ]
      });
      expect($rootScope.agg.params.orderBy).to.be('agg1');
    });

    it('selects _term if the first metric is avg_bucket', function () {
      $rootScope.responseValueAggs = [
        {
          id: 'agg1',
          type: {
            name: 'avg_bucket',
            metric: 'custom'
          }
        }
      ];
      $rootScope.$digest();
      expect($rootScope.agg.params.orderBy).to.be('_term');
    });

    it('selects _term if the selected metric is removed', function () {
      init({
        responseValueAggs: [
          {
            id: 'agg1',
            type: {
              name: 'count'
            }
          }
        ]
      });
      expect($rootScope.agg.params.orderBy).to.be('agg1');
      $rootScope.responseValueAggs = [];
      $rootScope.$digest();
      expect($rootScope.agg.params.orderBy).to.be('_term');
    });

    it('adds "custom metric" option');
    it('lists all metric agg responses');
    it('lists individual values of a multi-value metric');
    it('displays a metric editor if "custom metric" is selected');
    it('saves the "custom metric" to state and refreshes from it');
    it('invalidates the form if the metric agg form is not complete');

    describe('convert import/export from old format', function () {

      it('it doesnt do anything with string type', function () {
        init({
          aggParams: {
            include: '404',
            exclude: '400',
          }
        });

        const aggConfig = $rootScope.agg;
        const includeArg = $rootScope.agg.type.params.byName.include;
        const excludeArg = $rootScope.agg.type.params.byName.exclude;

        expect(includeArg.serialize(aggConfig.params.include)).to.equal('404');
        expect(excludeArg.serialize(aggConfig.params.exclude)).to.equal('400');

        const output = { params: {} };

        includeArg.write(aggConfig, output);
        excludeArg.write(aggConfig, output);

        expect(output.params.include).to.equal('404');
        expect(output.params.exclude).to.equal('400');
      });

      it('converts object to string type', function () {
        init({
          aggParams: {
            include: {
              pattern: '404'
            }, exclude: {
              pattern: '400'
            },
          }
        });

        const aggConfig = $rootScope.agg;
        const includeArg = $rootScope.agg.type.params.byName.include;
        const excludeArg = $rootScope.agg.type.params.byName.exclude;

        expect(includeArg.serialize(aggConfig.params.include)).to.equal('404');
        expect(excludeArg.serialize(aggConfig.params.exclude)).to.equal('400');

        const output = { params: {} };

        includeArg.write(aggConfig, output);
        excludeArg.write(aggConfig, output);

        expect(output.params.include).to.equal('404');
        expect(output.params.exclude).to.equal('400');
      });

    });
  });
});
