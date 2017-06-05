import angular from 'angular';
import moment from 'moment';
import expect from 'expect.js';
import _ from 'lodash';
import sinon from 'sinon';
import ngMock from 'ng_mock';
import 'plugins/kibana/visualize/index';
import 'plugins/kibana/dashboard/index';
import 'plugins/kibana/discover/index';


// TODO: This should not be needed, timefilter is only included here, it should move

let $parentScope;

let $scope;

let $elem;
const anchor = '2014-01-01T06:06:06.666Z';

const init = function () {
  // Load the application
  ngMock.module('kibana');

  // Create the scope
  ngMock.inject(function ($rootScope, $compile) {

    // Give us a scope
    $parentScope = $rootScope;

    // Add some parameters to it
    const timefilter = {
      time : {
        from: moment().subtract(15, 'minutes'),
        to: moment(),
        mode: undefined
      },
      refreshInterval : {
        value : 0,
        display : 'Off'
      }
    };
    $parentScope.timefilter = timefilter;
    $parentScope.updateInterval = sinon.spy();
    $parentScope.updateFilter = sinon.spy();

    // Create the element
    $elem = angular.element(
      '<kbn-timepicker' +
      ' from="timefilter.time.from"' +
      ' to="timefilter.time.to"' +
      ' mode="timefilter.time.mode"' +
      ' active-tab="timefilter.timepickerActiveTab"' +
      ' interval="timefilter.refreshInterval"' +
      ' on-interval-select="updateInterval(interval)"' +
      ' on-filter-select="updateFilter(from, to)">' +
      '</kbn-timepicker>'
    );

    // And compile it
    $compile($elem)($parentScope);

    // Fire a digest cycle
    $elem.scope().$digest();

    // Grab the isolate scope so we can test it
    $scope = $elem.isolateScope();
  });
};


describe('timepicker directive', function () {
  const sandbox = sinon.sandbox.create();

  beforeEach(function () {
    // Stub out the clock so 'now' doesn't move
    sandbox.useFakeTimers(moment(anchor).valueOf());

    init();
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('tabs', function () {
    it('should contain two tabs', function () {
      expect($elem.find('.tab-pane').length).to.be(2);
    });
  });

  describe('refresh interval', function () {
    beforeEach(function () {
      ngMock.inject(function ($rootScope) {
        $rootScope.$apply();
      });
    });

    it('should contain a list of options', function () {
      expect($elem.find('.kbn-refresh-section').length).to.be.greaterThan(0);
    });

    it('should have a $scope.setRefreshInterval() that calls handler', function () {
      $scope.setRefreshInterval({ value : 10000  });
      sinon.assert.calledOnce($parentScope.updateInterval);
      expect($parentScope.updateInterval.firstCall.args[0]).to.have.property('value', 10000);
    });

    it('should unpause when setRefreshInterval is called without pause:true', function () {
      $scope.setRefreshInterval({ value : 1000, pause: true });
      expect($parentScope.updateInterval.getCall(0).args[0]).to.have.property('pause', true);

      $scope.setRefreshInterval({ value : 1000, pause: false });
      expect($parentScope.updateInterval.getCall(1).args[0]).to.have.property('pause', false);

      $scope.setRefreshInterval({ value : 1000 });
      expect($parentScope.updateInterval.getCall(2).args[0]).to.have.property('pause', false);
    });


    it('should highlight the current active interval', function () {
      $scope.interval = { value: 300000 };
      $elem.scope().$digest();
      expect($elem.find('.refresh-interval-active').length).to.be(1);
      expect($elem.find('.refresh-interval-active').text().trim()).to.be('5 minutes');
    });
  });

  describe('mode setting', function () {
    it('should be in quick mode by default', function () {
      expect($scope.mode).to.be('quick');
    });

    it('should highlight the right mode', function () {
      expect($elem.find('.kbn-timepicker-modes .active').text().trim()).to.be('quick');

      // Each of the 3 modes
      const modes = ['absolute', 'relative', 'quick'];
      _.each(modes, function (mode) {
        $scope.setMode(mode);
        $scope.$digest();
        expect($elem.find('.kbn-timepicker-modes .active').text().trim()).to.be(mode);
      });
    });
  });

  describe('quick mode', function () {

    beforeEach(function () {
      $scope.setMode('quick');
      $scope.$digest();
    });

    it('should contain 4 lists of options', function () {
      expect($elem.find('.kbn-timepicker-section .list-unstyled').length).to.be(4);
    });

    it('should have a $scope.setQuick() that calls handler', function () {
      $scope.setQuick('now', 'now');
      sinon.assert.calledOnce($parentScope.updateFilter);
      expect($parentScope.updateFilter.firstCall.args[0]).to.be('now');
      expect($parentScope.updateFilter.firstCall.args[1]).to.be('now');
    });
  });

  describe('relative mode', function () {

    beforeEach(function () {
      $scope.setMode('relative');
      $scope.$digest();
    });

    it('has a preview of the "from" input', function () {
      const preview = $elem.find('.kbn-timepicker-section span[ng-show="relative.from.preview"]');
      expect(preview.text()).to.be(moment().subtract(15, 'minutes').format($scope.format));
    });

    it('has a disabled "to" field that contains "Now"', function () {
      expect($elem.find('.kbn-timepicker-section span[ng-show="relative.to.preview"]').text()).to.be('Now');
    });

    it('has a submit handler', function () {
      const form = $elem.find('form[ng-submit="applyRelative()"]');
      expect(form.length).to.be(1);
    });

    it('disables the submit button if the form is invalid', function () {
      let button;
      button = $elem.find('button[disabled]');
      expect(button.length).to.be(0);

      // Make the form invalid
      $scope.relative.from.count = -3;
      $scope.formatRelative('from');
      $scope.$digest();

      button = $elem.find('button[disabled]');
      expect(button.length).to.be(1);
    });

    it('has a dropdown bound to relative.from.unit that contains all of the intervals', function () {
      const select = $elem.find('.kbn-timepicker-section select[ng-model="relative.from.unit"]');
      expect(select.length).to.be(1);
      expect(select.find('option').length).to.be(14);

      // Check each relative option, make sure it is in the list
      _.each($scope.relativeOptions, function (unit, i) {
        expect(select.find('option')[i].text).to.be(unit.text);
      });
    });

    it('has a checkbox that is checked when rounding is enabled', function () {
      const checkbox = $elem.find('.kbn-timepicker-section input[ng-model="relative.from.round"]');
      expect(checkbox.length).to.be(1);

      // Rounding is disabled by default
      expect(checkbox.prop('checked')).to.be(false);

      // Enable rounding
      $scope.relative.from.round = true;
      $scope.$digest();
      expect(checkbox.prop('checked')).to.be(true);
    });

    it('rounds the preview down to the unit when rounding is enabled', function () {
      // Enable rounding
      $scope.relative.from.round = true;
      $scope.relative.from.count = 0;

      _.each($scope.units, function (longUnit, shortUnit) {
        $scope.relative.from.count = 0;
        $scope.relative.from.unit = shortUnit;
        $scope.formatRelative('from');

        // The preview should match the start of the unit eg, the start of the minute
        expect($scope.relative.from.preview).to.be(moment().startOf(longUnit).format($scope.format));
      });
    });

    it('does not round the preview down to the unit when rounding is disable', function () {
      // Disable rounding
      $scope.relative.from.round = false;
      $scope.relative.from.count = 1;

      _.each($scope.units, function (longUnit, shortUnit) {
        $scope.relative.from.unit = shortUnit;
        $scope.formatRelative('from');

        const matches = shortUnit.match(/([smhdwMy])(\+)?/);
        let unit;
        let opp = '-';
        if (matches) {
          unit = matches[1];
          opp = matches[2];
        }

        const fn = opp === '+' ? 'add' : 'subtract';

        // The preview should match the start of the unit eg, the start of the minute
        expect($scope.relative.from.preview).to.be(moment()[fn](1, unit).format($scope.format));
      });
    });

    it('has a $scope.applyRelative() that sets from and to based on relative.round, relative.count and relative.unit', function () {
      // Disable rounding
      $scope.relative.from.round = false;
      $scope.relative.from.count = 1;
      $scope.relative.from.unit = 's';
      $scope.applyRelative();
      sinon.assert.calledOnce($parentScope.updateFilter);
      expect($parentScope.updateFilter.getCall(0).args[0]).to.be('now-1s');

      $scope.relative.from.count = 2;
      $scope.relative.from.unit = 'm';
      $scope.applyRelative();
      expect($parentScope.updateFilter.getCall(1).args[0]).to.be('now-2m');

      $scope.relative.from.count = 3;
      $scope.relative.from.unit = 'h';
      $scope.applyRelative();
      expect($parentScope.updateFilter.getCall(2).args[0]).to.be('now-3h');

      // Enable rounding
      $scope.relative.from.round = true;
      $scope.relative.from.count = 7;
      $scope.relative.from.unit = 'd';
      $scope.applyRelative();
      expect($parentScope.updateFilter.getCall(3).args[0]).to.be('now-7d/d');
    });

    it('updates the input fields when the scope variables are changed', function () {
      const input = $elem.find('.kbn-timepicker-section input[ng-model="relative.from.count"]');
      const select = $elem.find('.kbn-timepicker-section select[ng-model="relative.from.unit"]');

      $scope.relative.from.count = 5;
      $scope.$digest();
      expect(input.val()).to.be('5');


      // Should update the selected option
      _.each($scope.units, function (longUnit, shortUnit) {
        $scope.relative.from.unit = shortUnit;
        $scope.$digest();

        expect(select.val().split(':')[1]).to.be(shortUnit);
      });
    });
  });

  describe('absolute mode', function () {

    let inputs;

    beforeEach(function () {
      $scope.setMode('absolute');
      $scope.$digest();

      inputs = {
        fromInput: $elem.find('.kbn-timepicker-section input[ng-model="absolute.from"]'),
        toInput: $elem.find('.kbn-timepicker-section input[ng-model="absolute.to"]'),
        fromCalendar: $elem.find('.kbn-timepicker-section div[ng-model="pickFromDate"] '),
        toCalendar: $elem.find('.kbn-timepicker-section div[ng-model="pickToDate"] '),
      };
    });

    it('should have input boxes for absolute.from and absolute.to', function () {
      expect(inputs.fromInput.length).to.be(1);
      expect(inputs.toInput.length).to.be(1);
    });

    it('should have tables that contain calendars bound to absolute.from and absolute.to', function () {
      expect(inputs.fromCalendar.length).to.be(1);
      expect(inputs.toCalendar.length).to.be(1);
    });

    it('should present a timeframe of 15 minutes ago to now if scope.from and scope.to are not set', function () {
      delete $scope.from;
      delete $scope.to;
      $scope.setMode('absolute');
      $scope.$digest();

      expect($scope.absolute.from.valueOf()).to.be(moment().subtract(15, 'minutes').valueOf());
      expect($scope.absolute.to.valueOf()).to.be(moment().valueOf());
    });

    it('should update its own variables if timefilter time is updated', function () {
      $scope.setMode('absolute');
      $scope.$digest();

      const startDate = moment('1980-01-01T00:11:02.001Z');
      const endDate = moment('1983-10-11T0=40:03:32.051Z');

      $parentScope.timefilter.time.from = startDate;
      $parentScope.timefilter.time.to = endDate;
      $parentScope.$digest();

      expect($scope.absolute.from.valueOf()).to.be(startDate.valueOf());
      expect($scope.absolute.to.valueOf()).to.be(endDate.valueOf());
    });

    it('should disable the "Go" button if from > to', function () {
      $scope.absolute.from = moment('2012-02-01');
      $scope.absolute.to = moment('2012-02-11');
      $scope.$digest();
      expect($elem.find('[data-test-subj="timepickerGoButton"]').attr('disabled')).to.be(undefined);

      $scope.absolute.from = moment('2012-02-12');
      $scope.absolute.to = moment('2012-02-11');
      $scope.$digest();
      expect($elem.find('[data-test-subj="timepickerGoButton"]').attr('disabled')).to.be('disabled');
    });

    it('should only copy its input to scope.from and scope.to when scope.applyAbsolute() is called', function () {
      $scope.from = 'now-30m';
      $scope.to = 'now';

      $scope.absolute.from = moment('2012-02-01');
      $scope.absolute.to = moment('2012-02-11');
      expect($scope.from).to.be('now-30m');
      expect($scope.to).to.be('now');

      $scope.applyAbsolute();
      expect($parentScope.updateFilter.firstCall.args[0]).to.eql(moment('2012-02-01'));
      expect($parentScope.updateFilter.firstCall.args[1]).to.eql(moment('2012-02-11'));

      $scope.$digest();
    });

    it('should set from/to to start/end of day if set from datepicker', function () {
      $scope.pickFromDate(new Date('2012-02-01 12:00'));
      $scope.pickToDate(new Date('2012-02-11 12:00'));
      $scope.applyAbsolute();

      expect($parentScope.updateFilter.firstCall.args[0].valueOf()).to.be(moment('2012-02-01 00:00:00.000').valueOf());
      expect($parentScope.updateFilter.firstCall.args[1].valueOf()).to.be(moment('2012-02-11 23:59:59.999').valueOf());
    });

    it('should allow setting hour/minute/second after setting from datepicker', function () {
      $scope.pickFromDate(new Date('2012-02-01 12:00'));
      $scope.pickToDate(new Date('2012-02-11 12:00'));
      $scope.applyAbsolute();

      expect($parentScope.updateFilter.firstCall.args[0].valueOf()).to.be(moment('2012-02-01 00:00:00.000').valueOf());
      expect($parentScope.updateFilter.firstCall.args[1].valueOf()).to.be(moment('2012-02-11 23:59:59.999').valueOf());

      $scope.absolute.from = moment('2012-02-01 01:23:45');
      $scope.absolute.to = moment('2012-02-11 12:34:56');
      $scope.applyAbsolute();

      expect($parentScope.updateFilter.secondCall.args[0].valueOf()).to.be(moment('2012-02-01 01:23:45').valueOf());
      expect($parentScope.updateFilter.secondCall.args[1].valueOf()).to.be(moment('2012-02-11 12:34:56').valueOf());
    });

    describe('datepicker timezone issue', function () {
      it('should ignore the timezone from the datepicker because it does not respect dateFormat:tz advanced setting', function () {
        moment.tz.setDefault('UTC');

        $scope.pickFromDate(new Date('2012-02-01 12:00-05:00'));
        $scope.pickToDate(new Date('2012-02-11 12:00-05:00'));
        $scope.$digest();

        const formattedFrom = inputs.fromInput.val();
        const formattedTo = inputs.toInput.val();

        expect(formattedFrom).to.be('2012-02-01 00:00:00.000');
        expect(formattedTo).to.be('2012-02-11 23:59:59.999');
      });

      after(function () {
        moment.tz.setDefault('Browser');
      });
    });

  });
});
