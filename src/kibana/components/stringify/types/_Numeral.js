define(function (require) {
  return function AbstractNumeralFormatProvider(Private) {
    var _ = require('lodash');
    var FieldFormat = Private(require('components/index_patterns/_field_format'));
    var numeral = require('numeral')();
    require('components/stringify/numeral/numeral');

    _(Numeral).inherits(FieldFormat);
    function Numeral(params) {
      Numeral.Super.call(this, params);
    }

    Numeral.prototype._convert = function (val) {
      if (typeof val !== 'number') {
        val = parseFloat(val);
      }

      if (isNaN(val)) return '';

      return numeral.set(val).format(this.param('pattern'));
    };


    Numeral.factory = function (opts) {
      _(Class).inherits(Numeral);
      function Class(params) {
        Class.Super.call(this, params);
      }

      Class.id = opts.id;
      Class.title = opts.title;
      Class.fieldType = 'number';

      Class.paramDefaults = opts.paramDefaults || FieldFormat.initConfig({
        pattern: '=format:' + opts.id + ':defaultPattern',
      });

      Class.editor = {
        template: opts.editorTemplate || require('text!components/stringify/numeral/numeral.html'),
        controllerAs: 'cntrl',
        controller: opts.controller || function () {
          this.samples = opts.samples;
        }
      };

      if (opts.prototype) {
        _.assign(Class.prototype, opts.prototype);
      }

      return Class;
    };

    return Numeral;
  };
});
