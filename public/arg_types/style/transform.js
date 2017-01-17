import parse from './parse';

//
// Transform implementation or originally thanks to
// https://github.com/raphamorim/native-css
//
// This file from https://github.com/staxmanade/CssToReact/blob/gh-pages/src/transform.js
// MIT License as of 2016-01-17
//

export default function transform(inputCssText) {

  function cleanPropertyName(name) {
    // turn things like 'align-items' into 'alignItems'
    name = name.replace(/(-.)/g, function (v) { return v[1].toUpperCase(); });

    return name;
  };

  function mediaNameGenerator(name) {
    return '@media ' + name;
  };

  function nameGenerator(name) {
    name = name.replace(/\s\s+/g, ' ');
    name = name.replace(/[^a-zA-Z0-9]/g, '_');
    name = name.replace(/^_+/g, '');
    name = name.replace(/_+$/g, '');
    return name;
  };

  function transformRules(self, rules, result) {
    rules.forEach(function (rule) {
      const obj = {};
      if (rule.type === 'media') {
        const name = mediaNameGenerator(rule.media);
        const media = result[name] = result[name] || {
          '__expression__': rule.media
        };
        transformRules(self, rule.rules, media);
      } else if (rule.type === 'rule') {
        rule.declarations.forEach(function (declaration) {
          if (declaration.type === 'declaration') {
            const cleanProperty = cleanPropertyName(declaration.property);
            obj[cleanProperty] = declaration.value;
          }
        });
        rule.selectors.forEach(function (selector) {
          const name = nameGenerator(selector.trim());
          result[name] = obj;
        });
      }
    });
  }

  if (!inputCssText) {
    throw new Error('missing css text to transform');
  }

  // If the input "css" doesn't wrap it with a css class (raw styles)
  // we need to wrap it with a style so the css parser doesn't choke.
  let bootstrapWithCssClass = false;
  if (inputCssText.indexOf('{') === -1) {
    bootstrapWithCssClass = true;
    inputCssText = `.bootstrapWithCssClass { ${inputCssText} }`;
  }

  let css = parse(inputCssText);
  let result = {};
  transformRules(this, css.stylesheet.rules, result);

  // Don't expose the implementation detail of our wrapped css class.
  if (bootstrapWithCssClass) {
    result = result.bootstrapWithCssClass;
  }

  return result;
}
