
export default function workdpadReducer(workpadState = {}, { type, payload }) {
  if (type === 'sizeWorkpad') {
    return Object.assign({}, workpadState, payload);
  }

  if (type === 'setColors') {
    return Object.assign({}, workpadState, { colors: payload });
  }

  if (type === 'setName') {
    return { ...workpadState, name: payload };
  }

  return workpadState;
}
