import _ from 'lodash';
import { noWhiteSpace } from '../../utils/no_white_space';
import { toJson } from '../../utils/aggressive_parse';
import { FieldFormat } from '../field_format';
import { shortenDottedString } from '../../utils/shorten_dotted_string';

export function stringifySource() {
  const template = _.template(noWhiteSpace(require('./_source.html')));

  class SourceFormat extends FieldFormat {
    constructor(params, getConfig) {
      super(params);

      this.getConfig = getConfig;
    }

    static id = '_source';
    static title = '_source';
    static fieldType = '_source';
  }

  SourceFormat.prototype._convert = {
    text: (value) => toJson(value),
    html: function sourceToHtml(source, field, hit) {
      if (!field) return this.getConverterFor('text')(source, field, hit);

      const highlights = (hit && hit.highlight) || {};
      const formatted = field.indexPattern.formatHit(hit);
      const highlightPairs = [];
      const sourcePairs = [];

      const isShortDots = this.getConfig('shortDots:enable');
      _.keys(formatted).forEach((key) => {
        const pairs = highlights[key] ? highlightPairs : sourcePairs;
        const field = isShortDots ? shortenDottedString(key) : key;
        const val = formatted[key];
        pairs.push([field, val]);
      }, []);

      return template({ defPairs: highlightPairs.concat(sourcePairs) });
    }
  };

  return SourceFormat;
}
