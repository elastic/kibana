import { uiModules } from '../modules';

import {
  parseCommaSeparatedList,
  formatListAsProse,
} from '../../../utils';

uiModules
  .get('kibana')
  .filter('commaList', function () {
  /**
   * Angular filter that accepts either an array or a comma-seperated string
   * and outputs a comma-seperated string for presentation.
   *
   * @param {String|Array} input - The comma-seperated list or array
   * @param {Boolean} inclusive - Should the list be joined with an "and"?
   * @return {String}
   */
    return function (input, inclusive = false) {
      return formatListAsProse(parseCommaSeparatedList(input), { inclusive });
    };
  });
