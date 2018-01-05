
export function buildAggBody(fieldName, scriptedFields) {

  const scriptedField = scriptedFields.find(field => {
    return field.name === fieldName;
  });

  if (scriptedField) {
    return {
      script: {
        inline: scriptedField.script,
        lang: scriptedField.lang
      }
    };
  }

  return {
    field: fieldName
  };
}
