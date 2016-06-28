'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _postcss = require('postcss');

var _postcss2 = _interopRequireDefault(_postcss);

var _libClone = require('./lib/clone');

var _libClone2 = _interopRequireDefault(_libClone);

var list = _postcss2['default'].list;
var prefixes = ['-webkit-', '-moz-', '-ms-', '-o-'];

function intersect(a, b, not) {
    return a.filter(function (c) {
        var index = ~b.indexOf(c);
        return not ? !index : index;
    });
}

var different = function different(a, b) {
    return intersect(a, b, true).concat(intersect(b, a, true));
};
var filterPrefixes = function filterPrefixes(selector) {
    return intersect(prefixes, selector);
};

function sameVendor(selectorsA, selectorsB) {
    var same = function same(selectors) {
        return selectors.map(filterPrefixes).join();
    };
    return same(selectorsA) === same(selectorsB);
}

var noVendor = function noVendor(selector) {
    return !filterPrefixes(selector).length;
};

function sameParent(ruleA, ruleB) {
    var hasParent = ruleA.parent && ruleB.parent;
    var sameType = hasParent && ruleA.parent.type === ruleB.parent.type;
    // If an at rule, ensure that the parameters are the same
    if (hasParent && ruleA.parent.type !== 'root' && ruleB.parent.type !== 'root') {
        sameType = sameType && ruleA.parent.params === ruleB.parent.params;
    }
    return hasParent ? sameType : true;
}

function canMerge(ruleA, ruleB) {
    var a = list.comma(ruleA.selector);
    var b = list.comma(ruleB.selector);

    var parent = sameParent(ruleA, ruleB);
    return parent && (a.concat(b).every(noVendor) || sameVendor(a, b));
}

var getDecls = function getDecls(rule) {
    return rule.nodes.map(String);
};
var joinSelectors = function joinSelectors() {
    for (var _len = arguments.length, rules = Array(_len), _key = 0; _key < _len; _key++) {
        rules[_key] = arguments[_key];
    }

    return rules.map(function (s) {
        return s.selector;
    }).join();
};

function ruleLength() {
    for (var _len2 = arguments.length, rules = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        rules[_key2] = arguments[_key2];
    }

    return rules.map(function (r) {
        return r.nodes.length ? String(r) : '';
    }).join('').length;
}

function partialMerge(first, second) {
    var _this = this;

    var intersection = intersect(getDecls(first), getDecls(second));
    if (!intersection.length) {
        return second;
    }
    var nextRule = second.next();
    if (nextRule && nextRule.type !== 'comment') {
        var nextIntersection = intersect(getDecls(second), getDecls(nextRule));
        if (nextIntersection.length > intersection.length) {
            first = second;second = nextRule;intersection = nextIntersection;
        }
    }
    var recievingBlock = second.cloneBefore({
        selector: joinSelectors(first, second),
        nodes: [],
        before: ''
    });
    var difference = different(getDecls(first), getDecls(second));
    var firstClone = (0, _libClone2['default'])(first);
    var secondClone = (0, _libClone2['default'])(second);
    var moveDecl = function moveDecl(callback) {
        return function (decl) {
            var intersects = ~intersection.indexOf(String(decl));
            var base = decl.prop.split('-')[0];
            var canMove = difference.every(function (d) {
                return d.split(':')[0] !== base;
            });
            if (intersects && canMove) {
                callback.call(_this, decl);
            }
        };
    };
    firstClone.eachDecl(moveDecl(function (decl) {
        decl.removeSelf();
        recievingBlock.append(decl);
    }));
    secondClone.eachDecl(moveDecl(function (decl) {
        return decl.removeSelf();
    }));
    var merged = ruleLength(firstClone, recievingBlock, secondClone);
    var original = ruleLength(first, second);
    if (merged < original) {
        first.replaceWith(firstClone);
        second.replaceWith(secondClone);
        [firstClone, recievingBlock, secondClone].forEach(function (r) {
            if (!r.nodes.length) {
                r.removeSelf();
            }
        });
        if (!secondClone.parent) {
            return recievingBlock;
        }
        return secondClone;
    } else {
        recievingBlock.removeSelf();
        return second;
    }
}

function selectorMerger() {
    var cache = null;
    return function (rule) {
        // Prime the cache with the first rule, or alternately ensure that it is
        // safe to merge both declarations before continuing
        if (!cache || !canMerge(rule, cache)) {
            cache = rule;
            return;
        }
        // Ensure that we don't deduplicate the same rule; this is sometimes
        // caused by a partial merge
        if (cache === rule) {
            cache = rule;
            return;
        }
        // Merge when declarations are exactly equal
        // e.g. h1 { color: red } h2 { color: red }
        if (getDecls(rule).join(';') === getDecls(cache).join(';')) {
            rule.selector = joinSelectors(cache, rule);
            cache.removeSelf();
            cache = rule;
            return;
        }
        // Merge when both selectors are exactly equal
        // e.g. a { color: blue } a { font-weight: bold }
        if (cache.selector === rule.selector) {
            var toString = String(cache);
            rule.eachInside(function (decl) {
                if (~toString.indexOf(String(decl))) {
                    return decl.removeSelf();
                }
                decl.moveTo(cache);
            });
            rule.removeSelf();
            return;
        }
        // Partial merge: check if the rule contains a subset of the last; if
        // so create a joined selector with the subset, if smaller.
        cache = partialMerge(cache, rule);
    };
}

exports['default'] = _postcss2['default'].plugin('postcss-merge-rules', function () {
    return function (css) {
        css.eachRule(selectorMerger());
    };
});
module.exports = exports['default'];