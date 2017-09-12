import Fn from '../../../common/functions/fn.js';
import { getState } from '../../state/store';
import { getGlobalFilterExpression } from '../../state/selectors/workpad';
import { fromExpression } from '../../../common/lib/ast';
import { interpretAst } from '../../lib/interpreter';
import filter from '../../../common/types/filter';

export default new Fn({
  name: 'filters',
  type: 'filter',
  help: 'Collect the workpad filters, usually to provide them to a data source',
  fn: () => {
    const filterExpression = getGlobalFilterExpression(getState());

    if (filterExpression && filterExpression.length) {
      const filterAST = fromExpression(filterExpression);
      return interpretAst(filterAST);
    } else {
      return filter.from(null);
    }

  },
});
