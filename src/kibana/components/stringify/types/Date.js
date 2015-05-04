define(function (require) {
  return function DateTimeFormatProvider(Private) {
    var _ = require('lodash');
    var FieldFormat = Private(require('components/index_patterns/_field_format/FieldFormat'));
    var BoundToConfigObj = Private(require('components/bound_to_config_obj'));
    var moment = require('moment');

    require('components/field_format_editor/pattern/pattern');

    _(DateTime).inherits(FieldFormat);
    function DateTime(params) {
      DateTime.Super.call(this, params);
    }

    DateTime.id = 'date';
    DateTime.title = 'Date';
    DateTime.fieldType = 'date';

    DateTime.paramDefaults = new BoundToConfigObj({
      pattern: '=dateFormat'
    });

    DateTime.editor = {
      template: require('text!components/stringify/editors/date.html'),
      controllerAs: 'cntrl',
      controller: function ($interval, $scope) {
        var self = this;
        self.sampleInputs = [
          Date.now(),
          +moment().startOf('year'),
          +moment().endOf('year')
        ];

        $scope.$on('$destroy', $interval(function () {
          self.sampleInputs[0] = Date.now();
        }, 1000));
      }
    };

    DateTime.prototype._convert = function (val) {
      // don't give away our ref to converter so
      // we can hot-swap when config changes
      var pattern = this.param('pattern');

      if (this._memoizedPattern !== pattern) {
        this._memoizedPattern = pattern;
        this._memoizedConverter = _.memoize(function converter(val) {
          return moment(val).format(pattern);
        });
      }
      return this._memoizedConverter(val);
    };

    return DateTime;
  };
});
