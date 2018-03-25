import { Scanner } from 'ui/utils/scanner';

export async function scanAllTypes($http, kbnIndex, typesToInclude) {
  const scanner = new Scanner($http, {
    index: kbnIndex,
    typesToInclude,
  });
  const results = await scanner.scanAndMap('', {
    pageSize: 1000,
    docCount: Infinity
  });
  return results;
}
