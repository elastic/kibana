import { interpretAst } from '../../lib/interpreter';
import { fromExpression } from '../../../common/lib/ast';
import { getType } from '../../../common/types/get_type';
import { renderableSet } from './render';

export const expressionRun = (expression) => {
  return (dispatch, /*getState*/) => {
    function run(exp, context) {
      interpretAst(fromExpression(exp), context)
      .then(resp => {
        // If this is renderable, cool, do your thing
        if (getType(resp) === 'render') {
          dispatch(renderableSet(resp));
        // Otherwise, cast it to a renderable
        } else {
          run('render()', resp);
        }
      });
    }
    run(expression);
  };
};
