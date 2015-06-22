(function() {
  var capitalize, names, prefix;

  capitalize = function(str) {
    return str.slice(0, 1).toUpperCase() + str.slice(1);
  };

  names = {
    ie: 'IE',
    ie_mob: 'IE Mobile',
    ios_saf: 'iOS',
    op_mini: 'Opera Mini',
    op_mob: 'Opera Mobile',
    and_chr: 'Chrome for Android',
    and_ff: 'Firefox for Android'
  };

  prefix = function(name, transition, prefixes) {
    var out;
    out = '  ' + name + (transition ? '*' : '') + ': ';
    out += prefixes.map(function(i) {
      return i.replace(/^-(.*)-$/g, '$1');
    }).join(', ');
    out += "\n";
    return out;
  };

  module.exports = function(prefixes) {
    var atrules, browser, data, list, name, needTransition, out, props, selector, selectors, string, transitionProp, useTransition, value, values, version, versions, _i, _j, _k, _len, _len1, _len2, _ref, _ref1, _ref2, _ref3, _ref4, _ref5, _ref6;
    if (prefixes.browsers.selected.length === 0) {
      return "No browsers selected";
    }
    versions = [];
    _ref = prefixes.browsers.selected;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      browser = _ref[_i];
      _ref1 = browser.split(' '), name = _ref1[0], version = _ref1[1];
      name = names[name] || capitalize(name);
      if (versions[name]) {
        versions[name].push(version);
      } else {
        versions[name] = [version];
      }
    }
    out = "Browsers:\n";
    for (browser in versions) {
      list = versions[browser];
      list = list.sort(function(a, b) {
        return parseFloat(b) - parseFloat(a);
      });
      out += '  ' + browser + ': ' + list.join(', ') + "\n";
    }
    atrules = '';
    _ref2 = prefixes.add;
    for (name in _ref2) {
      data = _ref2[name];
      if (name[0] === '@' && data.prefixes) {
        atrules += prefix(name, false, data.prefixes);
      }
    }
    if (atrules !== '') {
      out += "\nAt-Rules:\n" + atrules;
    }
    selectors = '';
    _ref3 = prefixes.add.selectors;
    for (_j = 0, _len1 = _ref3.length; _j < _len1; _j++) {
      selector = _ref3[_j];
      if (selector.prefixes) {
        selectors += prefix(selector.name, false, selector.prefixes);
      }
    }
    if (selectors !== '') {
      out += "\nSelectors:\n" + selectors;
    }
    values = '';
    props = '';
    useTransition = false;
    needTransition = (_ref4 = prefixes.add.transition) != null ? _ref4.prefixes : void 0;
    _ref5 = prefixes.add;
    for (name in _ref5) {
      data = _ref5[name];
      if (name[0] !== '@' && data.prefixes) {
        transitionProp = needTransition && prefixes.data[name].transition;
        if (transitionProp) {
          useTransition = true;
        }
        props += prefix(name, transitionProp, data.prefixes);
      }
      if (!data.values) {
        continue;
      }
      if (prefixes.transitionProps.some(function(i) {
        return i === name;
      })) {
        continue;
      }
      _ref6 = data.values;
      for (_k = 0, _len2 = _ref6.length; _k < _len2; _k++) {
        value = _ref6[_k];
        string = prefix(value.name, false, value.prefixes);
        if (values.indexOf(string) === -1) {
          values += string;
        }
      }
    }
    if (useTransition) {
      props += "  * - can be used in transition\n";
    }
    if (props !== '') {
      out += "\nProperties:\n" + props;
    }
    if (values !== '') {
      out += "\nValues:\n" + values;
    }
    if (atrules === '' && selectors === '' && props === '' && values === '') {
      out += '\nAwesome! Your browsers don\'t require any vendor prefixes.' + '\nNow you can remove Autoprefixer from build steps.';
    }
    return out;
  };

}).call(this);
