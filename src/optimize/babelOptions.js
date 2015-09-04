exports.webpack = {
  stage: 1,
  nonStandard: false,
  optional: ['runtime']
};

exports.node = Object.assign({}, exports.webpack);
