export default function getIntervalAndTimefield(panel, series) {
  const timeField = series.override_index_pattern && series.series_time_field || panel.time_field;
  const interval = series.override_index_pattern && series.series_interval || panel.interval;
  return { timeField, interval };
}
