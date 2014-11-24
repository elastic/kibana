define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');

  var OFFSET = 10;
  var $clone;

  function positionTooltip(opts) {
    if (!opts) return;
    var $chart = $(opts.$chart);
    var $el = $(opts.$el);
    var $window = $(opts.$window || window);
    var $sizer = $(opts.$sizer);
    var prev = opts.prev || {};
    var event = opts.event;

    if (!$chart.size() || !$el.size()) return;

    var size = getTtSize($el, $sizer);
    var pos = getBasePosition(size, event);
    var overflow = getOverflow(size, pos, [$chart, $window]);

    return placeToAvoidOverflow(pos, prev, overflow);
  }

  function getTtSize($el, $sizer) {
    var ttHtml = $el.html();
    if ($sizer.html() !== ttHtml) {
      $sizer.html(ttHtml);
    }

    var size = {
      width: $sizer.outerWidth(),
      height: $sizer.outerHeight()
    };

    return size;
  }

  function getBasePosition(size, event) {
    return {
      east: event.clientX + OFFSET,
      west: event.clientX - size.width - OFFSET,
      south: event.clientY + OFFSET,
      north: event.clientY - size.height - OFFSET
    };
  }

  function getBounds($el) {
    // in testing, $window is not actually a window, so we need to add
    // the offsets to make it work right.
    var bounds = $el.offset() || { top: 0, left: 0 };
    bounds.top += $el.scrollTop();
    bounds.left += $el.scrollLeft();
    bounds.bottom = bounds.top + $el.outerHeight();
    bounds.right = bounds.left + $el.outerWidth();
    return bounds;
  }

  function getOverflow(size, pos, containers) {
    var overflow = {};

    containers.map(getBounds).forEach(function (bounds) {
      // number of pixels that the toolip would overflow it's far
      // side, if we placed it that way. (negative === no overflow)
      mergeOverflows(overflow, {
        north: bounds.top - pos.north,
        east: (pos.east + size.width) - bounds.right,
        south: (pos.south + size.height) - bounds.bottom,
        west: bounds.left - pos.west
      });
    });

    return overflow;
  }

  function mergeOverflows(dest, src) {
    return _.merge(dest, src, function (a, b) {
      if (a == null || b == null) return a || b;
      return Math.max(a, b);
    });
  }

  function pickPlacement(prop, pos, overflow, prev, pref, fallback, placement) {
    var stash = '_' + prop;

    // first choice
    var first = prev[stash] || pref;
    // second choice
    var second = first === pref ? fallback : pref;

    if (overflow[first] > 0) {
      if (overflow[second] < 0) {
        placement[prop] = pos[second];
        placement[stash] = second;
      } else {
        placement[prop] = pos[first] - overflow[first];
        placement[stash] = first;
      }
    } else {
      placement[prop] = pos[first];
      placement[stash] = first;
    }
  }

  function placeToAvoidOverflow(pos, prev, overflow) {
    var placement = {};
    pickPlacement('top', pos, overflow, prev, 'south', 'north', placement);
    pickPlacement('left', pos, overflow, prev, 'east', 'west', placement);
    return placement;
  }

  // expose units/helpers for testing
  positionTooltip.getTtSize = getTtSize;
  positionTooltip.getBasePosition = getBasePosition;
  positionTooltip.getOverflow = getOverflow;
  positionTooltip.getBounds = getBounds;
  positionTooltip.placeToAvoidOverflow = placeToAvoidOverflow;
  positionTooltip.removeClone = function () {
    $clone && $clone.remove();
    $clone = null;
  };

  return positionTooltip;
});