export const appendWildcard = (nativeEvent, value) => {
  const { data } = nativeEvent;

  // Invalid key press
  if (data == null) {
    return;
  }

  // If it's not a letter, number or is something longer, reject it
  if (!/[a-z0-9]/i.test(data) || data.length !== 1) {
    return;
  }

  let newValue = value + data;
  if (newValue.length !== 1 || newValue === '*') {
    return;
  }

  newValue += '*';
  return newValue;
};
