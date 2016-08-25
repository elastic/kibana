import angular from 'angular';
import _ from 'lodash';
import sinon from 'auto-release-sinon';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import getFakeRow from 'fixtures/fake_row';
import $ from 'jquery';
import 'plugins/kibana/discover/index';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';

describe('Doc Table', function () {

  let $parentScope;

  let $scope;

  let config;

  // Stub out a minimal mapping of 4 fields
  let mapping;

  beforeEach(ngMock.module('kibana', 'apps/discover'));
  beforeEach(ngMock.inject(function (_config_, $rootScope, Private) {
    config = _config_;
    $parentScope = $rootScope;
    $parentScope.indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
    mapping = $parentScope.indexPattern.fields.byName;
  }));

  // Sets up the directive, take an element, and a list of properties to attach to the parent scope.
  const init = function ($elem, props) {
    ngMock.inject(function ($compile) {
      _.assign($parentScope, props);
      $compile($elem)($parentScope);
      $elem.scope().$digest();
      $scope = $elem.isolateScope();
    });
  };

  const destroy = function () {
    $scope.$destroy();
    $parentScope.$destroy();
  };

  // For testing column removing/adding for the header and the rows
  //
  const columnTests = function (elemType, parentElem) {

    it('should create a time column if the timefield is defined', function (done) {
      const childElems = parentElem.find(elemType);
      expect(childElems.length).to.be(2);
      done();
    });

    it('should be able to add and remove columns', function (done) {
      let childElems;
      // Should include a column for toggling and the time column by default
      $parentScope.columns = ['bytes'];
      parentElem.scope().$digest();
      childElems = parentElem.find(elemType);
      expect(childElems.length).to.be(3);
      expect($(childElems[2]).text()).to.contain('bytes');

      $parentScope.columns = ['bytes', 'request_body'];
      parentElem.scope().$digest();
      childElems = parentElem.find(elemType);
      expect(childElems.length).to.be(4);
      expect($(childElems[3]).text()).to.contain('request_body');

      $parentScope.columns = ['request_body'];
      parentElem.scope().$digest();
      childElems = parentElem.find(elemType);
      expect(childElems.length).to.be(3);
      expect($(childElems[2]).text()).to.contain('request_body');
      done();
    });

    it('should create only the toggle column if there is no timeField', function (done) {
      delete parentElem.scope().indexPattern.timeFieldName;
      parentElem.scope().$digest();

      const childElems = parentElem.find(elemType);
      expect(childElems.length).to.be(1);
      done();
    });

  };


  describe('kbnTableHeader', function () {

    const $elem = angular.element(
      '<thead kbn-table-header columns="columns" index-pattern="indexPattern" sort="sort"></thead>'
    );

    beforeEach(function () {
      init($elem, {
        columns: [],
        sorting: [],
      });
    });
    afterEach(function () {
      destroy();
    });

    describe('adding and removing columns', function () {
      columnTests('th', $elem);
    });


    describe('sorting', function () {
      it('should have a sort function that sets the elements of the sort array', function (done) {
        expect($scope.sort).to.be.a(Function);
        done();
      });

      it('should have a headClasser function that determines the css classes of the sort icons', function (done) {
        expect($scope.headerClass).to.be.a(Function);
        done();
      });

      it('should sort asc by default, then by desc if already sorting', function (done) {
        const fields = ['bytes', '@timestamp'];

        // Should not be sorted at first
        expect($scope.sorting).to.eql(undefined);
        expect($scope.headerClass(fields[0])).to.contain('fa-sort-up');

        $scope.sort(fields[0]);
        expect($scope.sorting).to.eql([fields[0], 'asc']);
        expect($scope.headerClass(fields[0])).to.contain('fa-sort-up');

        $scope.sort(fields[0]);
        expect($scope.sorting).to.eql([fields[0], 'desc']);
        expect($scope.headerClass(fields[0])).to.contain('fa-sort-down');

        $scope.sort(fields[0]);
        expect($scope.sorting).to.eql([fields[0], 'asc']);
        expect($scope.headerClass(fields[0])).to.contain('fa-sort-up');

        $scope.sort(fields[1]);
        expect($scope.sorting).to.eql([fields[1], 'asc']);
        expect($scope.headerClass(fields[1])).to.contain('fa-sort-up');

        // Should show the default sort for any other fields[0]
        expect($scope.headerClass(fields[0])).to.contain('fa-sort-up');

        done();
      });

      it('should NOT sort unindexed fields', function (done) {
        $scope.sort('request_body');
        expect($scope.sorting).to.be(undefined);
        done();
      });

      it('should NOT sort geo_point fields', function (done) {
        $scope.sort('point');
        expect($scope.sorting).to.be(undefined);
        done();
      });
    });

    describe('moving columns', function () {
      beforeEach(function () {
        $parentScope.columns = ['bytes', 'request_body', '@timestamp', 'point'];
        $elem.scope().$digest();
      });

      it('should move columns to the right', function () {

        $scope.moveRight('bytes');
        expect($scope.columns[1]).to.be('bytes');

        $scope.moveRight('bytes');
        expect($scope.columns[2]).to.be('bytes');
      });

      it('shouldnt move the last column to the right', function () {
        expect($scope.columns[3]).to.be('point');

        $scope.moveRight('point');
        expect($scope.columns[3]).to.be('point');
      });

      it('should move columns to the left', function () {
        $scope.moveLeft('@timestamp');
        expect($scope.columns[1]).to.be('@timestamp');

        $scope.moveLeft('request_body');
        expect($scope.columns[1]).to.be('request_body');
      });

      it('shouldnt move the first column to the left', function () {
        expect($scope.columns[0]).to.be('bytes');

        $scope.moveLeft('bytes');
        expect($scope.columns[0]).to.be('bytes');
      });
    });
  });

  describe('kbnTableRow', function () {
    const $elem = angular.element(
      '<tr kbn-table-row="row" ' +
      'columns="columns" ' +
      'sorting="sorting"' +
      'filter="filter"' +
      'index-pattern="indexPattern"' +
      '></tr>'
    );

    beforeEach(function () {

      init($elem, {
        row: getFakeRow(0, mapping),
        columns: [],
        sorting: [],
        filter: sinon.spy(),
        maxLength: 50,
      });

      // Ignore the metaFields (_id, _type, etc) since we don't have a mapping for them
      sinon.stub(config, 'get').withArgs('metaFields').returns([]);

    });
    afterEach(function () {
      destroy();
    });

    describe('adding and removing columns', function () {
      columnTests('td', $elem);
    });

    describe('details row', function () {
      it('should be an empty tr by default', function () {
        expect($elem.next().is('tr')).to.be(true);
        expect($elem.next().text()).to.be('');
      });

      it('should expand the detail row when the toggle arrow is clicked', function () {
        $elem.children(':first-child').click();
        $scope.$digest();
        expect($elem.next().text()).to.not.be('');
      });

      describe('expanded', function () {
        let $details;
        beforeEach(function () {
          // Open the row
          $scope.toggleRow();
          $scope.$digest();
          $details = $elem.next();
        });
        afterEach(function () {
          // Close the row
          $scope.toggleRow();
          $scope.$digest();
        });

        it('should be a tr with something in it', function () {
          expect($details.is('tr')).to.be(true);
          expect($details.text()).to.not.be.empty();
        });

      });

    });
  });

  describe('kbnTableRow meta', function () {

    const $elem = angular.element(
        '<tr kbn-table-row="row" ' +
        'columns="columns" ' +
        'sorting="sorting"' +
        'filtering="filtering"' +
        'index-pattern="indexPattern"' +
        '></tr>'
    );
    let $details;

    beforeEach(function () {
      const row = getFakeRow(0, mapping);
      mapping._id = {indexed: true, type: 'string'};
      row._source._id = 'foo';

      init($elem, {
        row: row,
        columns: [],
        sorting: [],
        filtering: sinon.spy(),
        maxLength: 50,
      });

      sinon.stub(config, 'get').withArgs('metaFields').returns(['_id']);

      // Open the row
      $scope.toggleRow();
      $scope.$digest();
      $details = $elem.next();
    });

    afterEach(function () {
      delete mapping._id;
      destroy();
    });

    it('should render even when the row source contains a field with the same name as a meta field', function () {
      expect($details.find('tr').length).to.be(_.keys($parentScope.indexPattern.flattenHit($scope.row)).length);
    });
  });

  describe('row diffing', function () {
    let $row;
    let $scope;
    let $root;
    let $before;

    beforeEach(ngMock.inject(function ($rootScope, $compile, Private) {
      $root = $rootScope;
      $root.row = getFakeRow(0, mapping);
      $root.columns = ['_source'];
      $root.sorting = [];
      $root.filtering = sinon.spy();
      $root.maxLength = 50;
      $root.mapping = mapping;
      $root.indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);

      $row = $('<tr>')
      .attr({
        'kbn-table-row': 'row',
        'columns': 'columns',
        'sorting': 'sortin',
        'filtering': 'filtering',
        'index-pattern': 'indexPattern',
      });

      $scope = $root.$new();
      $compile($row)($scope);
      $root.$apply();

      $before = $row.find('td');
      expect($before).to.have.length(3);
      expect($before.eq(0).text().trim()).to.be('');
      expect($before.eq(1).text().trim()).to.match(/^time_formatted/);
    }));

    afterEach(function () {
      $row.remove();
    });

    it('handles a new column', function () {
      $root.columns.push('bytes');
      $root.$apply();

      const $after = $row.find('td');
      expect($after).to.have.length(4);
      expect($after[0]).to.be($before[0]);
      expect($after[1]).to.be($before[1]);
      expect($after[2]).to.be($before[2]);
      expect($after.eq(3).text().trim()).to.match(/^bytes_formatted/);
    });

    it('handles two new columns at once', function () {
      $root.columns.push('bytes');
      $root.columns.push('request_body');
      $root.$apply();

      const $after = $row.find('td');
      expect($after).to.have.length(5);
      expect($after[0]).to.be($before[0]);
      expect($after[1]).to.be($before[1]);
      expect($after[2]).to.be($before[2]);
      expect($after.eq(3).text().trim()).to.match(/^bytes_formatted/);
      expect($after.eq(4).text().trim()).to.match(/^request_body_formatted/);
    });

    it('handles three new columns in odd places', function () {
      $root.columns = [
        '@timestamp',
        'bytes',
        '_source',
        'request_body'
      ];
      $root.$apply();

      const $after = $row.find('td');
      expect($after).to.have.length(6);
      expect($after[0]).to.be($before[0]);
      expect($after[1]).to.be($before[1]);
      expect($after.eq(2).text().trim()).to.match(/^@timestamp_formatted/);
      expect($after.eq(3).text().trim()).to.match(/^bytes_formatted/);
      expect($after[4]).to.be($before[2]);
      expect($after.eq(5).text().trim()).to.match(/^request_body_formatted/);
    });


    it('handles a removed column', function () {
      _.pull($root.columns, '_source');
      $root.$apply();

      const $after = $row.find('td');
      expect($after).to.have.length(2);
      expect($after[0]).to.be($before[0]);
      expect($after[1]).to.be($before[1]);
    });

    it('handles two removed columns', function () {
      // first add a column
      $root.columns.push('@timestamp');
      $root.$apply();

      const $mid = $row.find('td');
      expect($mid).to.have.length(4);

      $root.columns.pop();
      $root.columns.pop();
      $root.$apply();

      const $after = $row.find('td');
      expect($after).to.have.length(2);
      expect($after[0]).to.be($before[0]);
      expect($after[1]).to.be($before[1]);
    });

    it('handles three removed random columns', function () {
      // first add two column
      $root.columns.push('@timestamp', 'bytes');
      $root.$apply();

      const $mid = $row.find('td');
      expect($mid).to.have.length(5);

      $root.columns[0] = false; // _source
      $root.columns[2] = false; // bytes
      $root.columns = $root.columns.filter(Boolean);
      $root.$apply();

      const $after = $row.find('td');
      expect($after).to.have.length(3);
      expect($after[0]).to.be($before[0]);
      expect($after[1]).to.be($before[1]);
      expect($after.eq(2).text().trim()).to.match(/^@timestamp_formatted/);
    });

    it('handles two columns with the same content', function () {
      $root.row.$$_partialFormatted.request_body = $root.row.$$_partialFormatted.bytes;
      $root.columns.length = 0;
      $root.columns.push('bytes');
      $root.columns.push('request_body');
      $root.$apply();

      const $after = $row.find('td');
      expect($after).to.have.length(4);
      expect($after.eq(2).text().trim()).to.match(/^bytes_formatted/);
      expect($after.eq(3).text().trim()).to.match(/^bytes_formatted/);
    });

    it('handles two columns swapping position', function () {
      $root.columns.push('bytes');
      $root.$apply();

      const $mid = $row.find('td');
      expect($mid).to.have.length(4);

      $root.columns.reverse();
      $root.$apply();

      const $after = $row.find('td');
      expect($after).to.have.length(4);
      expect($after[0]).to.be($before[0]);
      expect($after[1]).to.be($before[1]);
      expect($after[2]).to.be($mid[3]);
      expect($after[3]).to.be($mid[2]);
    });

    it('handles four columns all reversing position', function () {
      $root.columns.push('bytes', 'response', '@timestamp');
      $root.$apply();

      const $mid = $row.find('td');
      expect($mid).to.have.length(6);

      $root.columns.reverse();
      $root.$apply();

      const $after = $row.find('td');
      expect($after).to.have.length(6);
      expect($after[0]).to.be($before[0]);
      expect($after[1]).to.be($before[1]);
      expect($after[2]).to.be($mid[5]);
      expect($after[3]).to.be($mid[4]);
      expect($after[4]).to.be($mid[3]);
      expect($after[5]).to.be($mid[2]);
    });

    it('handles multiple columns with the same name', function () {
      $root.columns.push('bytes', 'bytes', 'bytes');
      $root.$apply();

      const $after = $row.find('td');
      expect($after).to.have.length(6);
      expect($after[0]).to.be($before[0]);
      expect($after[1]).to.be($before[1]);
      expect($after[2]).to.be($before[2]);
      expect($after.eq(3).text().trim()).to.match(/^bytes_formatted/);
      expect($after.eq(4).text().trim()).to.match(/^bytes_formatted/);
      expect($after.eq(5).text().trim()).to.match(/^bytes_formatted/);
    });
  });
});
