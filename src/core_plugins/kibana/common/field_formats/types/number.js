import { createNumeralFormat } from './_numeral';

export function createNumberFormat(FieldFormat) {
  return createNumeralFormat(FieldFormat, {
    id: 'number',
    title: 'Number'
  });
}
