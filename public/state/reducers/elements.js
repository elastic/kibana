import { assign } from 'object-path-immutable';

export default function elementsReducer(workpadState = {}, { payload, type }) {
  if (type === 'ELEMENT_SET_EXPRESSION_AND_AST') {
    const { pageId, id, expression, ast } = payload;
    const path = ['pages', pageId, 'elements', id];
    return assign(workpadState, path, { expression, ast });
  }

  return workpadState;
}
