define(function (require) {
  return function CreateSVGUtilService(d3, Private) {
    var appendElem = Private(require('components/vislib/components/_functions/d3/_append_elem'));

    return function (el, width, height, name) {
      name = typeof name !== 'undefined' ? name : 'canvas';

      return appendElem(el, 'svg', name)
        .attr('width', width)
        .attr('height', height);
    };
  };
});
