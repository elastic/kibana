// see https://github.com/elastic/kibana/issues/11141 for details
export function shouldReadFieldFromDocValues(aggregatable, esType) {
  return aggregatable && esType !== 'text' && !esType.startsWith('_');
}
