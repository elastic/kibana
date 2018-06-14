export const getLegendConfig = (legend, size) => {
  if (!legend || size < 2) return { show: false };

  const config = {
    show: true,
    backgroundOpacity: 0,
    labelBoxBorderColor: 'transparent',
  };

  const acceptedPositions = ['nw', 'ne', 'sw', 'se'];

  config.position = !legend || acceptedPositions.includes(legend) ? legend : 'ne';

  return config;
};
