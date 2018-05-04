import { get } from 'lodash';

export const seriesStyleToFlot = seriesStyle => {
  if (!seriesStyle) return {};

  const flotStyle = {
    numbers: {
      show: true,
    },
    lines: {
      show: get(seriesStyle, 'lines') > 0,
      lineWidth: get(seriesStyle, 'lines'),
      fillColor: get(seriesStyle, 'color'),
      fill: get(seriesStyle, 'fill') / 10,
    },
    bars: {
      show: get(seriesStyle, 'bars') > 0,
      barWidth: get(seriesStyle, 'bars'),
      fill: 1,
      align: 'center',
      horizontal: get(seriesStyle, 'horizontalBars', false),
    },
    // This is here intentionally even though it is the default.
    // We use the `size` plugins for this and if the user says they want points
    // we just set the size to be static.
    points: { show: false },
    bubbles: {
      fill: get(seriesStyle, 'fill'),
    },
  };

  if (get(seriesStyle, 'stack')) flotStyle.stack = get(seriesStyle, 'stack');
  if (get(seriesStyle, 'color')) flotStyle.color = get(seriesStyle, 'color');

  return flotStyle;
};
