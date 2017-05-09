import { interpretAst } from '../../lib/interpreter';
import { fromExpression } from '../../../common/lib/ast';
import { getType } from '../../../common/types/get_type';
import { renderableSet } from './render';

export const expressionRun = (expression) => {
  return (dispatch, /*getState*/) => {
    let triedRender = false;
    function run(exp, context) {
      interpretAst(fromExpression(exp), context)
      .then(resp => {
        // If this is renderable, cool, do your thing
        if (getType(resp) === 'render') {
          dispatch(renderableSet(resp));
        // Otherwise, cast it to a renderable
        } else {
          if (triedRender) throw new Error (`Ack! I don't know how to render a '${getType(resp)}'`);
          triedRender = true;
          run('render()', resp);
        }
      });
    }
    run(expression);
  };
};
