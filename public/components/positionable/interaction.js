import $ from 'jquery';
import _ from 'lodash';

function setupInteraction(eventName, elem, e) {
  e.stopPropagation();
  const target = $(e.target);
  $('body').css({'user-select': 'none'});
  target.addClass('active');

  $(window).on('mouseup', () => {
    $('body').css({'user-select': 'auto'});
    target.removeClass('active');
    $(window).off('mouseup');
    $(window).off('mousemove');
  });
}

function getInteractionObj(target, originalEvent, originalPosition, originalSize) {
  return {
    target: target,
    originalEvent: originalEvent,
    originalPosition: originalPosition,
    interaction: {
      delta: {
        top: 0,
        left: 0,
        width: 0,
        height: 0
      },
      absolute: {
        top: Math.floor(originalPosition.top),
        left: Math.floor(originalPosition.left),
        height: Math.floor(originalSize.height),
        width: Math.floor(originalSize.width)
      }
    }
  };
}

function debugMarker(position, color, timeout, attachTo, size) {
  const marker = $('<div></div>')
  .css({
    height: size || 10,
    width: size || 10,
    'background-color': color || '#F00',
    'border-radius': '50%',
    'position': 'absolute',
    'z-index': 1000,
    'pointer-events': 'none'
  })
  .css(position);
  (attachTo || $('body')).append(marker);
  setTimeout(() => marker.remove(), timeout || 3000);
}


function getRotatedOffset(originalSize, deltaSize, angle) {
  const radians = angle * Math.PI / 180;
  const resizedSize = {width: originalSize.width + deltaSize.width, height: originalSize.height + deltaSize.height};

  // This returns the offset of the perceived rotated top-left, relative to an elements actual top left
  // You can use it to translate the element's absolute position to the user's perception of it as rotated
  function getRotationDelta(unrotated, compareTo) {
    compareTo = compareTo || unrotated;
    // A point -height/2 and -width/2 away from the perceived top-left,
    const rotated = {
      top: (unrotated.top * Math.cos(radians)) + (unrotated.left * Math.sin(radians)),
      left: (unrotated.top * Math.sin(radians)) - (unrotated.left * Math.cos(radians))
    };
    return {left: rotated.left + compareTo.left, top: -rotated.top + compareTo.top};
  }

  // The center of the container
  const original = {top: originalSize.height / 2, left: originalSize.width / 2};
  const originalDelta = getRotationDelta(original);

  const resized = {top: resizedSize.height / 2, left: resizedSize.width / 2};
  const resizedDelta = getRotationDelta(resized);

  const deltaLeft = {top: originalSize.height / 2, left: deltaSize.width + (originalSize.width / 2)};
  const deltaLeftDelta = getRotationDelta(deltaLeft, original);

  const deltaTop = {top: deltaSize.height + (originalSize.height / 2), left: originalSize.width / 2};
  const deltaTopDelta = getRotationDelta(deltaTop, original);

  const result = {
    fromAny: {left: resizedDelta.left - originalDelta.left, top: resizedDelta.top - originalDelta.top},
    fromLeft: {left: deltaLeftDelta.left - originalDelta.left, top: deltaLeftDelta.top - originalDelta.top},
    fromTop: {left: deltaTopDelta.left - originalDelta.left, top: deltaTopDelta.top - originalDelta.top}
  };

  return result;
};

function absAngle(angle) {
  while (angle >= 360) angle = 360 - angle;
  while (angle < 0) angle = 360 + angle;
  return angle;
}

function angleBetweenPoints(origin, destination) {
  if (origin.top === destination.top && origin.left === destination.left) return 0;
  return absAngle((Math.atan2(destination.top - origin.top, destination.left - origin.left) * 180 / Math.PI) + 90);
}

function distanceBetweenPoints(origin, destination) {
  const a = destination.top - origin.top;
  const b = destination.left - origin.left;

  return Math.sqrt((a * a) + (b * b));
}

function getPointByAngleAndDistance(origin, angle, distance) {
  const result = {};

  result.top = (Math.cos(angle * Math.PI / 180) * distance * -1) + origin.top;
  result.left = Math.sin(angle * Math.PI / 180) * distance + origin.left;

  return result;
}

function getElemCenter(elem) {
  return doUnrotated(elem, (elem) => {
    return {
      top: elem.offset().top + elem.outerHeight() / 2,
      left: elem.offset().left + elem.outerWidth() / 2
    };
  });
}

function getCurrentRotation(elem) {
  const matrixStr = elem.css('transform');
  if (matrixStr === 'none') return 0;

  const values = matrixStr.split('(')[1].split(')')[0].split(',');
  return absAngle(Math.atan2(values[1], values[0]) * (180 / Math.PI));
}

function doUnrotated(elem, fn) {
  const originalAngle = getCurrentRotation(elem);
  elem.css({transform: 'rotate(0deg)'});
  const result = fn(elem);
  elem.css({transform: `rotate(${originalAngle}deg)`});
  return result;
}

export const resize = (elem, config) => {
  const allHandles = _.values(config.sides).join(', ');
  elem.data('rework.resize.sides', allHandles);

  $(allHandles, elem).on('mousedown.reworkResize', (e) => {
    setupInteraction('mousedown.reworkResize', elem, e);
    const sides = _.chain(config.sides)
      .mapValues((side) => $(e.target).is(side))
      .omitBy((side) => !side)
      .keys()
      .value();

    const originalTarget = $(e.target);
    const originalEvent = e;
    const originalPointer = {
      top: e.pageY,
      left: e.pageX
    };

    const elemPosition = doUnrotated(elem, (elem) => elem.position());
    const elemBoundingRect = elem[0].getBoundingClientRect();
    const elemSize = {height: elem.outerHeight(), width: elem.outerWidth()};

    const elemAngle = getCurrentRotation(elem);

    function createPositionObj(e) {
      const pointerPosition = {
        top: e.pageY,
        left: e.pageX
      };

      const interactionAngle = angleBetweenPoints(originalPointer, pointerPosition);
      const interactionDistance = distanceBetweenPoints(originalPointer, pointerPosition);

      const unrotatedAngle = interactionAngle - elemAngle;
      const unrotatedPointer = getPointByAngleAndDistance(originalPointer, unrotatedAngle, interactionDistance);
      const unrotatedDelta = {
        top: unrotatedPointer.top - originalPointer.top,
        left: unrotatedPointer.left - originalPointer.left
      };

      const result = getInteractionObj(originalTarget, originalEvent, elemPosition, elemSize);

      if (_.includes(sides, 'bottom')) {
        result.interaction.delta.height = unrotatedDelta.top;
        result.interaction.absolute.height += result.interaction.delta.height;
      }

      if (_.includes(sides, 'right')) {
        result.interaction.delta.width = unrotatedDelta.left;
        result.interaction.absolute.width += result.interaction.delta.width;
      }

      if (_.includes(sides, 'left')) {
        result.interaction.delta.width = -unrotatedDelta.left;
        result.interaction.absolute.width += result.interaction.delta.width;
      }

      if (_.includes(sides, 'top')) {
        result.interaction.delta.height = -unrotatedDelta.top;
        result.interaction.absolute.height += result.interaction.delta.height;
      }

      // This *only* calculates based on width/height. Its up to you to figure out the left/top stuff
      const offset = getRotatedOffset(elemSize, result.interaction.delta, elemAngle);

      result.interaction.absolute.top -= offset.fromAny.top;
      result.interaction.absolute.left -= offset.fromAny.left;

      if (_.includes(sides, 'left')) {
        result.interaction.absolute.left += offset.fromLeft.left;
        result.interaction.absolute.top += offset.fromLeft.top;
      }

      if (_.includes(sides, 'top')) {
        result.interaction.absolute.left += offset.fromTop.left;
        result.interaction.absolute.top += offset.fromTop.top;
      }

      return result;
    }

    $(window).on('mousemove', (e) => config.on(createPositionObj(e)));
  });
};


export const rotate = (elem, config) => {
  elem.data('rework.rotate.handle', config.handle);

  $(config.handle, elem).on('mousedown.reworkRotate', (e) => {
    setupInteraction('mousedown.reworkRotate', elem, e);

    // TODO: SOoooo gross
    // Positioning goes wonky when rotated
    // So for the tiniest of moments, which the user can't even see, set 0 and get position
    // Then rotate back
    const elemCenter = getElemCenter(elem);

    function createRotationObj(e) {
      const elemSize = {height: elem.outerHeight(), width: elem.outerWidth()};


      const pointerPosition = {
        top: e.pageY,
        left: e.pageX
      };

      const result = {
        interaction: {
          absolute: {
            angle: Math.round(angleBetweenPoints(elemCenter, pointerPosition) * 10)  / 10
          }
        }
      };

      getRotatedOffset(elemSize, {height: 0, left: 0}, result.interaction.absolute.angle * Math.PI / 180);

      return result;
    }

    $(window).on('mousemove', (e) => config.on(createRotationObj(e)));
  });
};

export const move = (elem, config) => {
  elem.on('mousedown.reworkMove', (e) => {
    // TODO: This is hacky, but it needs to know if its being moved or resized, and later, rotated
    // Don't move if this is some handle for some other function
    const ignoreIf = [
      elem.data('rework.resize.sides'),
      elem.data('rework.rotate.handle')
    ].join(', ');

    if ($(e.target).is(ignoreIf)) return;

    setupInteraction('mousedown.reworkMove', elem, e);

    const target = $(e.target);
    const originalEvent = e;
    const originalPosition = doUnrotated(elem, (elem) => elem.position());
    const originalSize = {height: elem.outerHeight(), width: elem.outerWidth()};

    function createPositionObj(e) {
      var result = getInteractionObj(target, originalEvent, originalPosition, originalSize);

      result.interaction.delta.top = (e.pageY - originalEvent.pageY);
      result.interaction.delta.left = (e.pageX - originalEvent.pageX);

      result.interaction.absolute.top += result.interaction.delta.top;
      result.interaction.absolute.left += result.interaction.delta.left;

      return result;
    }

    $(window).on('mousemove', (e) => config.on(createPositionObj(e)));
  });
};

export const remove = (elem) => {
  $(elem).off('mousedown.reworkMove');
  $(elem).off('mousedown.reworkResize');
  $(elem).off('mousedown.reworkRotate');
  $('body').css({'user-select': 'auto'});
};
