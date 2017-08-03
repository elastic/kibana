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

export const newControl = () => ({
  indexPattern: '',
  fieldName: '',
  label: '',
  type: 'terms',
  size: 5,
  order: 'desc'
});
