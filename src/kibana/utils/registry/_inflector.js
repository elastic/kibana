define(function (require) {

  function upFirst(str) {
    return str.charAt(0).toUpperCase() + str.substr(1);
  }

  function inflector(prefix, postfix) {
    return function inflect(key) {
      var inflected = key;

      if (key.indexOf('.') !== -1) {
        inflected = key
          .split('.')
          .map(function (step, i) {
            return (i === 0) ? step : upFirst(step);
          })
          .join('');
      }

      if (prefix && key.indexOf(prefix) !== 0) {
        inflected = prefix + upFirst(inflected);
      }

      if (postfix && key.lastIndexOf(postfix) !== key.length - postfix.length) {
        inflected = inflected + postfix;
      }

      return inflected;
    };
  }

  return inflector;
});