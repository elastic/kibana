import { asPrettyString } from '../../utils/as_pretty_string';
import { shortenDottedString } from '../../utils/shorten_dotted_string';

export function createStringFormat(FieldFormat) {
  return class StringFormat extends FieldFormat {
    getParamDefaults() {
      return {
        transform: false
      };
    }

    _base64Decode(val) {
      try {
        return Buffer.from(val, 'base64').toString('utf8');
      } catch (e) {
        return asPrettyString(val);
      }
    }

    _toTitleCase(val) {
      return val.replace(/\w\S*/g, txt => { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); });
    }

    _convert(val) {
      switch (this.param('transform')) {
        case 'lower': return String(val).toLowerCase();
        case 'upper': return String(val).toUpperCase();
        case 'title': return this._toTitleCase(val);
        case 'short': return shortenDottedString(val);
        case 'base64': return this._base64Decode(val);
        default: return asPrettyString(val);
      }
    }

    static id = 'string';
    static title = 'String';
    static fieldType = [
      'number',
      'boolean',
      'date',
      'ip',
      'attachment',
      'geo_point',
      'geo_shape',
      'string',
      'murmur3',
      'unknown',
      'conflict'
    ];
  };
}
