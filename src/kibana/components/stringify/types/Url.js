define(function (require) {
  return function UrlFormatProvider(Private) {
    var _ = require('lodash');

    var FieldFormat = Private(require('components/index_patterns/_field_format'));
    var StringFormat = Private(require('components/stringify/types/String'));
    require('components/field_format_editor/pattern/pattern');

    _(Url).inherits(FieldFormat);
    function Url(params) {
      Url.Super.call(this, params);
      this._compileTemplate = _.memoize(this._compileTemplate);
    }

    Url.id = 'url';
    Url.title = 'Url';
    Url.fieldType = StringFormat.fieldType; // anything that can be serialized to a string is g2g!
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

    Url.prototype._convert = function (rawValue, contentType) {
      var template = this.param('template');
      var val = !template ? rawValue : this._compileTemplate(template)(rawValue);

      if (contentType !== 'html') return val;

      switch (this.param('type')) {
      case 'img': return '<img src="' + val + '" alt="' + rawValue + '">';
      default:
        return '<a href="' + val + '" target="_blank">' + val + '</a>';
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
