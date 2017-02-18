const intervalToDefaultPatternMap = {
  hours: '[logstash-]YYYY.MM.DD.HH',
  days: '[logstash-]YYYY.MM.DD',
  weeks: '[logstash-]GGGG.WW',
  months: '[logstash-]YYYY.MM',
  years: '[logstash-]YYYY',
};

export function getDefaultPatternForInterval(interval) {
  const defaultPattern = intervalToDefaultPatternMap[interval];

  if (defaultPattern) {
    return defaultPattern;
  }

  return 'logstash-*';
}
