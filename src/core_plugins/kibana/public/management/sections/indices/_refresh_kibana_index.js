export function RefreshKibanaIndex(esAdmin, kbnIndex) {
  return function () {
    return esAdmin.indices.refresh({
      index: kbnIndex
    });
  };
}
