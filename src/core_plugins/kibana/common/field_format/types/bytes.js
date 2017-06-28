import { Numeral } from './_numeral';

export function stringifyBytes() {
  return Numeral.factory({
    id: 'bytes',
    title: 'Bytes'
  });
}
