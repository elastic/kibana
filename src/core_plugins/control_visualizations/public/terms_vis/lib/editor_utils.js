export const setField = (fields, fieldIndex, field) => [
  ...fields.slice(0, fieldIndex),
  field,
  ...fields.slice(fieldIndex + 1)
];

export const addField = (fields, field) => [...fields, field];

export const newField = () => ({
  indexPattern: '',
  fieldName: '',
  label: ''
});

