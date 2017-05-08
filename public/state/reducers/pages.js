import { set, push } from 'object-path-immutable';

export default function pagesReducer(workpadState = {}, { type, payload }) {
  if (type === 'PAGE_ADD') {
    return push(workpadState, 'pages', payload);
  }

  if (type === 'PAGE_SET_NAME') {
    const { pageId, name } = payload;
    return set(workpadState, ['pages', pageId, 'name'], name);
  }

  return workpadState;
}
