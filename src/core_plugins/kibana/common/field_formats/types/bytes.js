import { createNumeralFormat } from './_numeral';

export function createBytesFormat(FieldFormat) {
  return createNumeralFormat(FieldFormat, {
    id: 'bytes',
    title: 'Bytes'
  });
}
