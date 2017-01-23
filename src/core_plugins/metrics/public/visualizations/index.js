import getLastValue from './lib/get_last_value';
import flot from './lib/flot';
import events from './lib/events';

import Timeseries from './lib/timeseries';
import Metric from './lib/metric';
import Gauge from './lib/gauge';
import CircleGauge from './lib/circle_gauge';
import HalfGauge from './lib/half_gauge';
import TopN from './lib/top_n';

export default {
  // visualizations
  TopN,
  Timeseries,
  Gauge,
  CircleGauge,
  HalfGauge,
  Metric,
  // utilities
  getLastValue,
  flot,
  events,
};
