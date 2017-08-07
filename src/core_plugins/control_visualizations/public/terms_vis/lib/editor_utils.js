export const setControl = (controls, controlIndex, control) => [
  ...controls.slice(0, controlIndex),
  control,
  ...controls.slice(controlIndex + 1)
];

export const addControl = (controls, control) => [...controls, control];

export const removeControl = (controls, controlIndex) => [
  ...controls.slice(0, controlIndex),
  ...controls.slice(controlIndex + 1)
];

export const getDefaultOptions = (type) => {
  const defaultOptions = {};
  switch (type) {
    case 'range':
      defaultOptions.step = 1;
      break;
    case 'terms':
      defaultOptions.size = 5;
      defaultOptions.order = 'desc';
      break;
    case 'text':
      break;
  }
  return defaultOptions;
};

export const newControl = (type) => ({
  indexPattern: '',
  fieldName: '',
  label: '',
  type: type,
  options: getDefaultOptions(type),
});
