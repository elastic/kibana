import header from './header.png';

export const timeFilter = {
  name: 'time_filter',
  displayName: 'Time Filter',
  help: 'Set a time window',
  image: header,
  expression: 'timefilterControl compact=true column=@timestamp | render as=time_filter',
  filter: 'timefilter column=@timestamp from=now-6M to=now-2M',
};
