(function() {
  var browsers, feature, map, prefix, textDecoration,
    __slice = [].slice;

  browsers = require('./browsers');

  feature = function(data, opts, callback) {
    var browser, interval, match, need, sorted, support, version, versions, _i, _len, _ref, _ref1, _ref2;
    if (!callback) {
      _ref = [opts, {}], callback = _ref[0], opts = _ref[1];
    }
    match = opts.full ? /y\sx($|\s)/ : /\sx($|\s)/;
    need = [];
    _ref1 = data.stats;
    for (browser in _ref1) {
      versions = _ref1[browser];
      for (interval in versions) {
        support = versions[interval];
        _ref2 = interval.split('-');
        for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
          version = _ref2[_i];
          if (browsers[browser] && support.match(match)) {
            version = version.replace(/\.0$/, '');
            need.push(browser + ' ' + version);
          }
        }
      }
    }
    sorted = need.sort(function(a, b) {
      a = a.split(' ');
      b = b.split(' ');
      if (a[0] > b[0]) {
        return 1;
      } else if (a[0] < b[0]) {
        return -1;
      } else {
        return parseFloat(a[1]) - parseFloat(b[1]);
      }
    });
    return callback(sorted);
  };

  map = function(browsers, callback) {
    var browser, name, version, _i, _len, _ref, _results;
    _results = [];
    for (_i = 0, _len = browsers.length; _i < _len; _i++) {
      browser = browsers[_i];
      _ref = browser.split(' '), name = _ref[0], version = _ref[1];
      version = parseFloat(version);
      _results.push(callback(browser, name, version));
    }
    return _results;
  };

  prefix = function() {
    var data, name, names, _i, _j, _len, _results;
    names = 2 <= arguments.length ? __slice.call(arguments, 0, _i = arguments.length - 1) : (_i = 0, []), data = arguments[_i++];
    _results = [];
    for (_j = 0, _len = names.length; _j < _len; _j++) {
      name = names[_j];
      _results.push(module.exports[name] = data);
    }
    return _results;
  };

  module.exports = {};

  feature(require('caniuse-db/features-json/border-radius'), function(browsers) {
    return prefix('border-radius', 'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius', {
      mistakes: ['-ms-'],
      browsers: browsers,
      transition: true
    });
  });

  feature(require('caniuse-db/features-json/css-boxshadow'), function(browsers) {
    return prefix('box-shadow', {
      browsers: browsers,
      transition: true
    });
  });

  feature(require('caniuse-db/features-json/css-animation'), function(browsers) {
    return prefix('animation', 'animation-name', 'animation-duration', 'animation-delay', 'animation-direction', 'animation-fill-mode', 'animation-iteration-count', 'animation-play-state', 'animation-timing-function', '@keyframes', {
      browsers: browsers
    });
  });

  feature(require('caniuse-db/features-json/css-transitions'), function(browsers) {
    return prefix('transition', 'transition-property', 'transition-duration', 'transition-delay', 'transition-timing-function', {
      mistakes: ['-ms-'],
      browsers: browsers
    });
  });

  feature(require('caniuse-db/features-json/transforms2d'), function(browsers) {
    return prefix('transform', 'transform-origin', {
      browsers: browsers,
      transition: true
    });
  });

  feature(require('caniuse-db/features-json/transforms3d'), function(browsers) {
    prefix('perspective', 'perspective-origin', {
      browsers: browsers,
      transition: true
    });
    return prefix('transform-style', 'backface-visibility', {
      browsers: browsers
    });
  });

  feature(require('caniuse-db/features-json/css-gradients'), function(browsers) {
    browsers = map(browsers, function(browser, name, version) {
      if (name === 'android' && version < 4 || name === 'ios_saf' && version < 5 || name === 'safari' && version < 5.1) {
        return browser + ' old';
      } else {
        return browser;
      }
    });
    return prefix('linear-gradient', 'repeating-linear-gradient', 'radial-gradient', 'repeating-radial-gradient', {
      props: ['background', 'background-image', 'border-image'],
      mistakes: ['-ms-'],
      browsers: browsers
    });
  });

  feature(require('caniuse-db/features-json/css3-boxsizing'), function(browsers) {
    return prefix('box-sizing', {
      browsers: browsers
    });
  });

  feature(require('caniuse-db/features-json/css-filters'), function(browsers) {
    return prefix('filter', {
      browsers: browsers,
      transition: true
    });
  });

  feature(require('caniuse-db/features-json/multicolumn'), function(browsers) {
    prefix('columns', 'column-width', 'column-gap', 'column-rule', 'column-rule-color', 'column-rule-width', {
      browsers: browsers,
      transition: true
    });
    return prefix('column-count', 'column-rule-style', 'column-span', 'column-fill', 'break-before', 'break-after', 'break-inside', {
      browsers: browsers
    });
  });

  feature(require('caniuse-db/features-json/user-select-none'), function(browsers) {
    return prefix('user-select', {
      browsers: browsers
    });
  });

  feature(require('caniuse-db/features-json/flexbox'), function(browsers) {
    browsers = map(browsers, function(browser, name, version) {
      if (name === 'safari' && version < 6.1) {
        return browser + ' 2009';
      } else if (name === 'ios_saf' && version < 7) {
        return browser + ' 2009';
      } else if (name === 'chrome' && version < 21) {
        return browser + ' 2009';
      } else if (name === 'android' && version < 4.4) {
        return browser + ' 2009';
      } else {
        return browser;
      }
    });
    prefix('display-flex', 'inline-flex', {
      props: ['display'],
      browsers: browsers
    });
    prefix('flex', 'flex-grow', 'flex-shrink', 'flex-basis', {
      transition: true,
      browsers: browsers
    });
    return prefix('flex-direction', 'flex-wrap', 'flex-flow', 'justify-content', 'order', 'align-items', 'align-self', 'align-content', {
      browsers: browsers
    });
  });

  feature(require('caniuse-db/features-json/calc'), function(browsers) {
    return prefix('calc', {
      props: ['*'],
      browsers: browsers
    });
  });

  feature(require('caniuse-db/features-json/background-img-opts'), function(browsers) {
    return prefix('background-clip', 'background-origin', 'background-size', {
      browsers: browsers
    });
  });

  feature(require('caniuse-db/features-json/font-feature'), function(browsers) {
    return prefix('font-feature-settings', 'font-variant-ligatures', 'font-language-override', 'font-kerning', {
      browsers: browsers
    });
  });

  feature(require('caniuse-db/features-json/border-image'), function(browsers) {
    return prefix('border-image', {
      browsers: browsers
    });
  });

  feature(require('caniuse-db/features-json/css-selection'), function(browsers) {
    return prefix('::selection', {
      selector: true,
      browsers: browsers
    });
  });

  feature(require('caniuse-db/features-json/css-placeholder'), function(browsers) {
    browsers = map(browsers, function(browser, name, version) {
      if (name === 'firefox' && version <= 18) {
        return browser + ' old';
      } else {
        return browser;
      }
    });
    return prefix('::placeholder', {
      selector: true,
      browsers: browsers
    });
  });

  feature(require('caniuse-db/features-json/css-hyphens'), function(browsers) {
    return prefix('hyphens', {
      browsers: browsers
    });
  });

  feature(require('caniuse-db/features-json/fullscreen'), function(browsers) {
    return prefix(':fullscreen', {
      selector: true,
      browsers: browsers
    });
  });

  feature(require('caniuse-db/features-json/css3-tabsize'), function(browsers) {
    return prefix('tab-size', {
      browsers: browsers
    });
  });

  feature(require('caniuse-db/features-json/intrinsic-width'), function(browsers) {
    return prefix('max-content', 'min-content', 'fit-content', 'fill-available', {
      props: ['width', 'min-width', 'max-width', 'height', 'min-height', 'max-height'],
      browsers: browsers
    });
  });

  feature(require('caniuse-db/features-json/css3-cursors-newer'), function(browsers) {
    prefix('zoom-in', 'zoom-out', {
      props: ['cursor'],
      browsers: browsers.concat(['chrome 3'])
    });
    return prefix('grab', 'grabbing', {
      props: ['cursor'],
      browsers: browsers.concat(['firefox 24', 'firefox 25', 'firefox 26'])
    });
  });

  feature(require('caniuse-db/features-json/css-sticky'), function(browsers) {
    return prefix('sticky', {
      props: ['position'],
      browsers: browsers
    });
  });

  feature(require('caniuse-db/features-json/pointer'), function(browsers) {
    return prefix('touch-action', {
      browsers: browsers
    });
  });

  textDecoration = require('caniuse-db/features-json/text-decoration');

  feature(textDecoration, function(browsers) {
    return prefix('text-decoration-style', {
      browsers: browsers
    });
  });

  feature(textDecoration, {
    full: true
  }, function(browsers) {
    return prefix('text-decoration-line', 'text-decoration-color', {
      browsers: browsers
    });
  });

  feature(require('caniuse-db/features-json/text-size-adjust'), function(browsers) {
    return prefix('text-size-adjust', {
      browsers: browsers
    });
  });

  feature(require('caniuse-db/features-json/css-masks'), function(browsers) {
    return prefix('clip-path', 'mask', 'mask-clip', 'mask-composite', 'mask-image', 'mask-origin', 'mask-position', 'mask-repeat', 'mask-size', {
      browsers: browsers
    });
  });

}).call(this);
