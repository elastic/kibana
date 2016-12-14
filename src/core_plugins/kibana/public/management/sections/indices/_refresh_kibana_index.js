export default function RefreshKibanaIndexFn(esAdmin, kbnIndex) {
  return function () {
    return esAdmin.indices.refresh({
      index: kbnIndex
    });
  };
}
