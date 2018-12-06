/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import _ from 'lodash';
import { asPrettyString } from '../../legacy/core_plugins/kibana/common/utils/as_pretty_string';
import { getHighlightHtml } from '../../legacy/core_plugins/kibana/common/highlight/highlight_html';

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
