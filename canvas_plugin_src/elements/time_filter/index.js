import header from './header.png';

export const timeFilter = () => ({
  name: 'time_filter',
  displayName: 'Time Filter',
  help: 'Set a time window',
  image: header,
  height: 50,
  expression: `timefilterControl compact=true column=@timestamp
| render`,
  filter: 'timefilter column=@timestamp from=now-24h to=now',
});
