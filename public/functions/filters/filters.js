import Fn from '../../../common/functions/fn.js';
import { getState } from '../../state/store';
import { getGlobalFilterExpression } from '../../state/selectors/workpad';
import { fromExpression } from '../../../common/lib/ast';
import { interpretAst } from '../../lib/interpreter';
import query from '../../../common/types/query';

export default new Fn({
  name: 'filters',
  type: 'query',
  help: 'Collect the workpad filters, usually to provide them to a data source',
  fn: () => {
    const filterExpression = getGlobalFilterExpression(getState());

    if (filterExpression && filterExpression.length) {
      const filterAST = fromExpression();
      return interpretAst(filterAST);
    } else {
      return query.from(null);
    }

  },
});
