export default function getIntervalAndTimefield(panel, series) {
  const timeField = series.override_index_pattern && series.series_time_field || panel.time_field;
  const interval = series.override_index_pattern && series.series_interval || panel.interval;
  const minInterval = series.override_index_pattern && series.series_min_interval || panel.min_interval;
  return { timeField, interval, minInterval };
}
