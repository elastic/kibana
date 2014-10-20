define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');

  var OFFSET = 10;
  var $clone;

  function positionTooltip($window, $chart, $tooltip, event) {
    $chart = $($chart);
    $tooltip = $($tooltip);

    if (!$chart.size() || !$tooltip.size()) return;

    var size = getTtSize($tooltip);
    var pos = getBasePosition(size, event);

    var overflow = getOverflow(size, pos, [
      getChartBounds($chart),
      getViewportBounds($window)
    ]);

    return placeToAvoidOverflow(pos, overflow);
  }

  function getTtSize($tooltip) {
    if (!$clone || $clone.html() !== $tooltip.html()) {
      $clone && $clone.remove();

      $clone = $tooltip
      .clone()
      .addClass('vis-tooltip-sizing-clone')
      .css({
        visibility: 'hidden',
        position: 'absolute',
        top: -100
      })
      .appendTo('body');
    }

    var size = {
      width: $clone.outerWidth(),
      height: $clone.outerHeight()
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

  function getChartBounds($chart) {
    var pos = $chart.offset();
    pos.right = pos.left + $chart.outerWidth();
    pos.bottom = pos.top + $chart.outerHeight();
    return pos;
  }

  function getViewportBounds($window) {
    var pos = {
      top: $window.scrollTop(),
      left: $window.scrollLeft(),
    };
    pos.bottom = pos.top + $window.height();
    pos.right = pos.left + $window.width();
    return pos;
  }

  function getOverflow(size, pos, containers) {
    var overflow = {};

    containers.forEach(function (container) {
      // number of pixels that the toolip would overflow it's far
      // side, if we placed it that way. (negative === no overflow)
      mergeOverflows(overflow, {
        north: container.top - pos.north,
        east: (pos.east + size.width) - container.right,
        south: (pos.south + size.height) - container.bottom,
        west: container.left - pos.west
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
  positionTooltip.getChartBounds = getChartBounds;
  positionTooltip.getViewportBounds = getViewportBounds;
  positionTooltip.placeToAvoidOverflow = placeToAvoidOverflow;
  positionTooltip.removeClone = function () {
    $clone && $clone.remove();
    $clone = null;
  };

  return positionTooltip;
});