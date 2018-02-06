import _ from 'lodash';
import { asPrettyString } from '../../utils/as_pretty_string';
import { DEFAULT_COLOR } from './color_default';

const convertTemplate = _.template('<span style="<%- style %>"><%- val %></span>');

export function createColorFormat(FieldFormat) {
  class ColorFormat extends FieldFormat {
    getParamDefaults() {
      return {
        fieldType: null, // populated by editor, see controller below
        colors: [_.cloneDeep(DEFAULT_COLOR)]
      };
    }

    findColorRuleForVal(val) {
      switch (this.param('fieldType')) {
        case 'string':
          return _.findLast(this.param('colors'), (colorParam) => {
            return new RegExp(colorParam.regex).test(val);
          });

        case 'number':
          return _.findLast(this.param('colors'), ({ range }) => {
            if (!range) return;
            const [start, end] = range.split(':');
            return val >= Number(start) && val <= Number(end);
          });

        default:
          return null;
      }
    }

    static id = 'color';
    static title = 'Color';
    static fieldType = [
      'number',
      'string'
    ];
  }

  ColorFormat.prototype._convert = {
    html(val) {
      const color = this.findColorRuleForVal(val);
      if (!color) return _.escape(asPrettyString(val));

      let style = '';
      if (color.text) style += `color: ${color.text};`;
      if (color.background) style += `background-color: ${color.background};`;
      return convertTemplate({ val, style });
    }
  };

  return ColorFormat;
}
