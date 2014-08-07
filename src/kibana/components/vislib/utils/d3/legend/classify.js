define(function (require) {
  return function LegendClassifyUtilService() {
    return function (name) {
      return 'c' + name.replace('/[#]/g', '');
    };
  };
});
