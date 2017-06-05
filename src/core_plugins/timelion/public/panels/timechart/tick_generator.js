module.exports = function generateTicksProvider() {

  function floorInBase(n, base) {
    return base * Math.floor(n / base);
  }

  function generateTicks(axis) {
    const returnTicks = [];
    let tickSize = 2;
    let delta = axis.delta;
    let steps = 0;
    let tickVal;
    let tickCount = 0;

    //Count the steps
    while (Math.abs(delta) >= 1024) {
      steps++;
      delta /= 1024;
    }

    //Set the tick size relative to the remaining delta
    while (tickSize <= 1024) {
      if (delta <= tickSize) {
        break;
      }
      tickSize *= 2;
    }
    axis.tickSize = tickSize * Math.pow(1024, steps);

    //Calculate the new ticks
    const tickMin = floorInBase(axis.min, axis.tickSize);
    do {
      tickVal = tickMin + (tickCount++) * axis.tickSize;
      returnTicks.push(tickVal);
    } while (tickVal < axis.max);

    return returnTicks;
  }

  return function (axis) {
    return generateTicks(axis);
  };
};
