import $ from 'jquery';
import ngMock from 'ng_mock';
import expect from 'expect.js';
import IndexPatternsFieldProvider from 'ui/index_patterns/_field';
import RegistryFieldFormatsProvider from 'ui/registry/field_formats';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
describe('FieldEditor directive', function () {

  let Field;
  let StringFormat;
  let $rootScope;

  let compile;
  let $scope;
  let $el;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function ($compile, $injector, Private) {
    $rootScope = $injector.get('$rootScope');
    Field = Private(IndexPatternsFieldProvider);
    StringFormat = Private(RegistryFieldFormatsProvider).getType('string');

    $rootScope.indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
    // set the field format for this field
    $rootScope.indexPattern.fieldFormatMap.time = new StringFormat({ foo: 1, bar: 2 });
    $rootScope.indexPattern._indexFields();
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
      let editor = $scope.editor;
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
        let a = {};
        let b = {};

        actual.script = a;
        expect(field.script).to.be(a);

        actual.script = b;
        expect(field.script).to.be(b);
      });

      it('is fully mutable, unlike the index patterns field', function () {
        let origName = actual.name;
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
  });

});
