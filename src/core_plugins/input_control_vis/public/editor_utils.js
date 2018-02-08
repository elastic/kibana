export const CONTROL_TYPES = {
  LIST: 'list',
  RANGE: 'range'
};

export const setControl = (controls, controlIndex, control) => [
  ...controls.slice(0, controlIndex),
  control,
  ...controls.slice(controlIndex + 1)
];

export const addControl = (controls, control) => [...controls, control];

export const moveControl = (controls, controlIndex, direction) => {
  let newIndex;
  if (direction >= 0) {
    newIndex = controlIndex + 1;
  } else {
    newIndex = controlIndex - 1;
  }

  if (newIndex < 0) {
    // Move first item to last
    return [
      ...controls.slice(1),
      controls[0]
    ];
  } else if (newIndex >= controls.length) {
    const lastItemIndex = controls.length - 1;
    // Move last item to first
    return [
      controls[lastItemIndex],
      ...controls.slice(0, lastItemIndex)
    ];
  } else {
    const swapped = controls.slice();
    const temp = swapped[newIndex];
    swapped[newIndex] = swapped[controlIndex];
    swapped[controlIndex] = temp;
    return swapped;
  }
};

export const removeControl = (controls, controlIndex) => [
  ...controls.slice(0, controlIndex),
  ...controls.slice(controlIndex + 1)
];

export const getDefaultOptions = (type) => {
  const defaultOptions = {};
  switch (type) {
    case CONTROL_TYPES.RANGE:
      defaultOptions.decimalPlaces = 0;
      defaultOptions.step = 1;
      break;
    case CONTROL_TYPES.LIST:
      defaultOptions.type = 'terms';
      defaultOptions.multiselect = true;
      defaultOptions.size = 5;
      defaultOptions.order = 'desc';
      break;
  }
  return defaultOptions;
};

export const newControl = (type) => ({
  id: (new Date()).getTime().toString(),
  indexPattern: '',
  fieldName: '',
  parent: '',
  label: '',
  type: type,
  options: getDefaultOptions(type),
});

export const getTitle = (controlParams, controlIndex) => {
  let title = `${controlParams.type}: ${controlIndex}`;
  if (controlParams.label) {
    title = `${controlParams.label}`;
  } else if (controlParams.fieldName) {
    title = `${controlParams.fieldName}`;
  }
  return title;
};
