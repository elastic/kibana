
export default function workdpadReducer(workpadState = {}, { type, payload }) {

  if (type === 'sizeWorkpad') {
    return Object.assign({}, workpadState, payload);
  }

  return workpadState;
}
