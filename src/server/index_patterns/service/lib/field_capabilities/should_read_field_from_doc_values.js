export function shouldReadFieldFromDocValues(aggregatable, esType) {
  return aggregatable && esType !== 'text' && !esType.startsWith('_');
}
