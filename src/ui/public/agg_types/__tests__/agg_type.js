import _ from 'lodash';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import sinon from 'auto-release-sinon';
import 'ui/private';
import AggParamsPM from 'ui/agg_types/agg_params';
import VisProvider from 'ui/vis';
import RegistryFieldFormatsProvider from 'ui/registry/field_formats';
import AggTypesAggTypeProvider from 'ui/agg_types/agg_type';
import VisAggConfigProvider from 'ui/vis/agg_config';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
describe('AggType Class', function () {
  let AggType;
  let AggParams;
  let AggConfig;
  let indexPattern;
  let fieldFormat;
  let Vis;


  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    AggParams = sinon.spy(Private(AggParamsPM));
    Private.stub(AggParamsPM, AggParams);

    Vis = Private(VisProvider);
    fieldFormat = Private(RegistryFieldFormatsProvider);
    AggType = Private(AggTypesAggTypeProvider);
    AggConfig = Private(VisAggConfigProvider);
    indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
  }));

  describe('constructor', function () {

    it('requires a config object as it\'s first param', function () {
      expect(function () {
        new AggType(null);
      }).to.throwError();
    });

    describe('application of config properties', function () {
      var copiedConfigProps = [
        'name',
        'title',
        'makeLabel',
        'ordered'
      ];

      describe('"' + copiedConfigProps.join('", "') + '"', function () {
        it('assigns the config value to itself', function () {
          var config = _.transform(copiedConfigProps, function (config, prop) {
            config[prop] = {};
          }, {});

          var aggType = new AggType(config);

          copiedConfigProps.forEach(function (prop) {
            expect(aggType[prop]).to.be(config[prop]);
          });
        });
      });

      describe('makeLabel', function () {
        it('makes a function when the makeLabel config is not specified', function () {
          var someGetter = function () {};

          var aggType = new AggType({
            makeLabel: someGetter
          });

          expect(aggType.makeLabel).to.be(someGetter);

          aggType = new AggType({
            name: 'pizza'
          });

          expect(aggType.makeLabel).to.be.a('function');
          expect(aggType.makeLabel()).to.be('pizza');
        });
      });

      describe('getFormat', function () {
        it('returns the formatter for the aggConfig', function () {
          var aggType = new AggType({});

          var vis = new Vis(indexPattern, {
            type: 'histogram',
            aggs: [
              {
                type: 'date_histogram',
                schema: 'segment'
              }
            ]
          });

          var aggConfig = vis.aggs.byTypeName.date_histogram[0];

          expect(aggType.getFormat(aggConfig)).to.be(fieldFormat.getDefaultInstance('date'));

          vis = new Vis(indexPattern, {
            type: 'metric',
            aggs: [
              {
                type: 'count',
                schema: 'metric'
              }
            ]
          });
          aggConfig = vis.aggs.byTypeName.count[0];

          expect(aggType.getFormat(aggConfig)).to.be(fieldFormat.getDefaultInstance('string'));
        });

        it('can be overridden via config', function () {
          var someGetter = function () {};

          var aggType = new AggType({
            getFormat: someGetter
          });

          expect(aggType.getFormat).to.be(someGetter);
        });
      });

      describe('params', function () {
        beforeEach(function () {
          AggParams.reset();
        });

        it('defaults to AggParams object with JSON param', function () {
          var aggType = new AggType({
            name: 'smart agg'
          });

          expect(aggType.params).to.be.an(AggParams);
          expect(aggType.params.length).to.be(2);
          expect(aggType.params[0].name).to.be('json');
          expect(aggType.params[1].name).to.be('customLabel');
        });

        it('can disable customLabel', function () {
          var aggType = new AggType({
            name: 'smart agg',
            customLabels: false
          });

          expect(aggType.params.length).to.be(1);
          expect(aggType.params[0].name).to.be('json');
        });

        it('passes the params arg directly to the AggParams constructor', function () {
          var params = [
            {name: 'one'},
            {name: 'two'}
          ];
          var paramLength = params.length + 2; // json and custom label are always appended

          var aggType = new AggType({
            name: 'bucketeer',
            params: params
          });

          expect(aggType.params).to.be.an(AggParams);
          expect(aggType.params.length).to.be(paramLength);
          expect(AggParams.callCount).to.be(1);
          expect(AggParams.firstCall.args[0]).to.be(params);
        });
      });

      describe('getResponseAggs', function () {
        it('copies the value', function () {
          var football = {};
          var aggType = new AggType({
            getResponseAggs: football
          });

          expect(aggType.getResponseAggs).to.be(football);
        });

        it('defaults to _.noop', function () {
          var aggType = new AggType({});

          expect(aggType.getResponseAggs).to.be(_.noop);
        });
      });
    });

  });

});
