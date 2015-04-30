define(function (require) {
  return function UrlFormatProvider(Private) {
    var _ = require('lodash');

    var FieldFormat = Private(require('components/index_patterns/_field_format/FieldFormat'));
    require('components/field_format_editor/pattern/pattern');

    _(Url).inherits(FieldFormat);
    function Url(params) {
      Url.Super.call(this, params);
      this._compileTemplate = _.memoize(this._compileTemplate);
    }

    Url.id = 'url';
    Url.title = 'Url';
    Url.fieldType = [
      'number',
      'boolean',
      'date',
      'ip',
      'string',
      'murmur3',
      'unknown',
      'conflict'
    ];

    Url.editor = {
      template: require('text!components/stringify/editors/url.html'),
      controllerAs: 'url',
      controller: function () {
        this.samples = [ 'john', '/some/pathname/asset.png', 1234 ];
      }
    };

    Url.templateMatchRE = /{{([\s\S]+?)}}/g;
    Url.paramDefaults = {
      type: 'a',
      template: null
    };

    Url.urlTypes = [
      { id: 'a', name: 'Link' },
      { id: 'img', name: 'Image' }
    ];

    Url.prototype._convert = {
      html: function (rawValue) {
        var url = this.convert(rawValue, 'text');
        var value = _.escape(rawValue);

        switch (this.param('type')) {
        case 'img': return '<img src="' + url + '" alt="' + value + '">';
        default:
          return '<a href="' + url + '" target="_blank">' + url + '</a>';
        }
      },

      text: function (value) {
        var template = this.param('template');
        return !template ? value : this._compileTemplate(template)(value);
      }
    };

    Url.prototype._compileTemplate = function (template) {
      var parts = template.split(Url.templateMatchRE).map(function (part, i) {
        // trim all the odd bits, the variable names
        return (i % 2) ? part.trim() : part;
      });

      return function (val) {
        var locals = {
          value: encodeURIComponent(val),
          rawValue: val
        };

        // replace all the odd bits with their local var
        var output = '';
        var i = -1;
        while (++i < parts.length) {
          if (i % 2) {
            var local = locals[parts[i]];
            output += local == null ? '' : local;
          } else {
            output += parts[i];
          }
        }

        return output;
      };
    };

    return Url;
  };
});
