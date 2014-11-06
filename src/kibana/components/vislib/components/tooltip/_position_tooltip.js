define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');

  var OFFSET = 10;
  var $clone;

  function positionTooltip($window, $chart, $tooltip, $sizer, event) {
    $chart = $($chart);
    $tooltip = $($tooltip);

    if (!$chart.size() || !$tooltip.size()) return;

    var size = getTtSize($tooltip, $sizer);
    var pos = getBasePosition(size, event);

    var overflow = getOverflow(size, pos, [$chart, $window]);

    return placeToAvoidOverflow(pos, overflow);
  }

  function getTtSize($tooltip, $sizer) {
    var ttHtml = $tooltip.html();
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

  function placeToAvoidOverflow(pos, overflow) {
    var placement = {};

    if (overflow.south > 0) {
      if (overflow.north < 0) {
        placement.top = pos.north;
      } else {
        placement.top = pos.south - overflow.south;
      }
    } else {
      placement.top = pos.south;
    }

    if (overflow.east > 0) {
      if (overflow.west < 0) {
        placement.left = pos.west;
      } else {
        placement.left = pos.east - overflow.east;
      }
    } else {
      placement.left = pos.east;
    }

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