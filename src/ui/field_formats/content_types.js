import _ from 'lodash';
import { asPrettyString } from '../../core_plugins/kibana/common/utils/as_pretty_string';
import { getHighlightHtml } from '../../core_plugins/kibana/common/highlight/highlight_html';

const types = {
  html: function (format, convert) {
    function recurse(value, field, hit, meta) {
      if (value == null) {
        return asPrettyString(value);
      }

      if (!value || typeof value.map !== 'function') {
        return convert.call(format, value, field, hit, meta);
      }

      const subVals = value.map(v => {
        return recurse(v, field, hit, meta);
      });
      const useMultiLine = subVals.some(sub => {
        return sub.indexOf('\n') > -1;
      });

      return subVals.join(',' + (useMultiLine ? '\n' : ' '));
    }

    return function (...args) {
      return `<span ng-non-bindable>${recurse(...args)}</span>`;
    };
  },

  text: function (format, convert) {
    return function recurse(value) {
      if (!value || typeof value.map !== 'function') {
        return convert.call(format, value);
      }

      // format a list of values. In text contexts we just use JSON encoding
      return JSON.stringify(value.map(recurse));
    };
  }
};

function fallbackText(value) {
  return asPrettyString(value);
}

function fallbackHtml(value, field, hit) {
  const formatted = _.escape(this.convert(value, 'text'));

  if (!hit || !hit.highlight || !hit.highlight[field.name]) {
    return formatted;
  } else {
    return getHighlightHtml(formatted, hit.highlight[field.name]);
  }
}

export function contentTypesSetup(format) {
  const src = format._convert || {};
  const converters = format._convert = {};

  converters.text = types.text(format, src.text || fallbackText);
  converters.html = types.html(format, src.html || fallbackHtml);

  return format._convert;
}
