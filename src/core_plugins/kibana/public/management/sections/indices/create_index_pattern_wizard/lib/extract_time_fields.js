export function extractTimeFields(fields) {
  const dateFields = fields.filter(field => field.type === 'date');

  if (dateFields.length === 0) {
    return [{
      display: `The indices which match this index pattern don't contain any time fields.`,
    }];
  }

  const disabledDividerOption = {
    isDisabled: true,
    display: '───',
    fieldName: '',
  };
  const noTimeFieldOption = {
    display: `I don't want to use the Time Filter`,
    fieldName: undefined,
  };

  return [
    ...dateFields.map(field => ({
      display: field.name,
      fieldName: field.name
    })),
    disabledDividerOption,
    noTimeFieldOption,
  ];
}
