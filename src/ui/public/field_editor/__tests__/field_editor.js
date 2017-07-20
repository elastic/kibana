import $ from 'jquery';
import ngMock from 'ng_mock';
import expect from 'expect.js';

import { IndexPatternsFieldProvider } from 'ui/index_patterns/_field';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import _ from 'lodash';

describe('FieldEditor directive', function () {

  let Field;
  let $rootScope;

  let compile;
  let $scope;
  let $el;

  let $httpBackend;
  let getScriptedLangsResponse;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function ($compile, $injector, Private) {
    $httpBackend = $injector.get('$httpBackend');
    getScriptedLangsResponse = $httpBackend.when('GET', '/api/kibana/scripts/languages');
    getScriptedLangsResponse.respond(['expression', 'painless']);

    $rootScope = $injector.get('$rootScope');
    Field = Private(IndexPatternsFieldProvider);

    $rootScope.indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
    $rootScope.indexPattern.stubSetFieldFormat('time', 'string', { foo: 1, bar: 2 });
    $rootScope.field = $rootScope.indexPattern.fields.byName.time;

    compile = function () {
      $el = $compile($('<field-editor field="field" index-pattern="indexPattern">'))($rootScope);
      $scope = $el.data('$isolateScope');
    };
  }));

  describe('$scope', function () {
    it('is isolated', function () {
      compile();
      expect($scope.parent == null).to.be.ok();
      expect($scope).to.not.be($rootScope);
    });

    it('exposes $scope.editor, a controller for the editor', function () {
      compile();
      const editor = $scope.editor;
      expect(editor).to.be.an('object');
    });
  });

  describe('$scope.editor', function () {
    let editor;

    beforeEach(function () {
      compile();
      editor = $scope.editor;
    });

    it('exposes editor.indexPattern', function () {
      expect(editor.indexPattern).to.be($rootScope.indexPattern);
    });

    it('exposes editor.field', function () {
      expect(editor.field).to.be.an('object');
    });

    describe('editor.field', function () {
      let field;
      let actual;

      beforeEach(function () {
        field = editor.field;
        actual = $rootScope.field;
      });

      it('looks like the field from the index pattern, but isn\'t', function () {
        expect(field).to.not.be(actual);
        expect(field).to.not.be.a(Field);
        expect(field.name).to.be(actual.name);
        expect(field.type).to.be(actual.type);
        expect(field.scripted).to.be(actual.scripted);
        expect(field.script).to.be(actual.script);
      });

      it('reflects changes to the index patterns field', function () {
        const a = {};
        const b = {};

        actual.script = a;
        expect(field.script).to.be(a);

        actual.script = b;
        expect(field.script).to.be(b);
      });

      it('is fully mutable, unlike the index patterns field', function () {
        const origName = actual.name;
        actual.name = 'john';
        expect(actual.name).to.not.be('john');
        expect(actual.name).to.be(origName);

        expect(field.name).to.be(origName);
        field.name = 'john';
        expect(field.name).to.be('john');
        expect(actual.name).to.be(origName);
      });
    });

    it('exposes editor.formatParams', function () {
      expect(editor).to.have.property('formatParams');
      expect(editor.field.format.params()).to.eql(editor.formatParams);
    });

    describe('editor.formatParams', function () {
      it('initializes with all of the formats current params', function () {
        // rebuild the editor
        compile();
        editor = $scope.editor;

        expect(editor.formatParams).to.have.property('foo', 1);
        expect(editor.formatParams).to.have.property('bar', 2);
      });

      it('updates the fields format when changed', function () {
        $rootScope.$apply(); // initial apply in order to pick up change
        editor.formatParams.foo = 200;
        $rootScope.$apply();
        expect(editor.field.format.param('foo')).to.be(200);
      });

    });

    describe('scripted fields', function () {
      let editor;
      let field;

      beforeEach(function () {
        $rootScope.field = $rootScope.indexPattern.fields.byName['script string'];
        compile();
        editor = $scope.editor;
        field = editor.field;
      });

      it('has a scripted flag set to true', function () {
        expect(field.scripted).to.be(true);
      });

      it('contains a lang param', function () {
        expect(field).to.have.property('lang');
        expect(field.lang).to.be('expression');
      });

      it('provides specific type when language is painless', function () {
        $rootScope.$apply();
        expect(editor.fieldTypes).to.have.length(1);
        expect(editor.fieldTypes[0]).to.be('number');

        editor.field.lang = 'painless';
        $rootScope.$apply();

        expect(editor.fieldTypes).to.have.length(4);
        expect(_.isEqual(editor.fieldTypes, ['number', 'string', 'date', 'boolean'])).to.be.ok();
      });

      it('provides all kibana types when language is groovy (only possible in 5.x)', function () {
        $rootScope.$apply();
        expect(editor.fieldTypes).to.have.length(1);
        expect(editor.fieldTypes[0]).to.be('number');

        editor.field.lang = 'groovy';
        $rootScope.$apply();

        expect(editor.fieldTypes).to.contain('number');
        expect(editor.fieldTypes).to.contain('string');
        expect(editor.fieldTypes).to.contain('geo_point');
        expect(editor.fieldTypes).to.contain('ip');
        expect(editor.fieldTypes).to.not.contain('text');
        expect(editor.fieldTypes).to.not.contain('keyword');
        expect(editor.fieldTypes).to.not.contain('attachement');
      });

      it('updates formatter options based on field type', function () {
        field.lang = 'painless';

        $rootScope.$apply();
        expect(editor.field.type).to.be('string');
        const stringFormats = editor.fieldFormatTypes;

        field.type = 'date';
        $rootScope.$apply();
        expect(editor.fieldFormatTypes).to.not.be(stringFormats);
      });
    });
  });

});
