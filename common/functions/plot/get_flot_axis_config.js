import { get, map } from 'lodash';
import { getType } from '../../lib/get_type';

export const getFlotAxisConfig = (axis, argValue, columns, ticks) => {
  if (!argValue || argValue.show === false) return { show: false };

  const config = { show: true };

  if (getType(argValue) === 'axisConfig') {
    // first value is used as the default
    const acceptedPositions = axis === 'x' ? ['bottom', 'top'] : ['left', 'right'];

    config.position = acceptedPositions.includes(argValue.position)
      ? argValue.position
      : acceptedPositions[0];
  }

  const axisType = get(columns, `${axis}.type`);

  if (axisType === 'string') {
    config.ticks = map(ticks[axis].hash, (position, name) => [position, name]);
  }

  if (axisType === 'date') config.mode = 'time';

  return config;
};
