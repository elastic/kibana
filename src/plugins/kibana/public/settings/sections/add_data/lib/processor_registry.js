export default [
  {
    id: 'simple1',
    title: 'Simple 1',
    default: true,
    template: '<processor-simple1></processor-simple1>'
  },
  {
    id: 'simple2',
    title: 'Simple 2',
    template: '<processor-simple2></processor-simple2>'
  },
  {
    id: 'regex',
    title: 'RegEx',
    template: '<processor-regex></processor-regex>'
  },
  {
    id: 'grok',
    title: 'Grok',
    //default: true,
    template: '<processor-grok></processor-grok>'
  },
  {
    id: 'kv',
    title: 'Kv',
    template: '<processor-kv></processor-kv>'
  },
  {
    id: 'geoip',
    title: 'Geo IP',
    template: '<processor-geoip></processor-geoip>'
  },
  {
    id: 'date',
    title: 'Date',
    template: '<processor-date></processor-date>'
  },
  {
    id: 'delete_fields',
    title: 'Delete Fields',
    template: '<processor-delete-fields></processor-delete-fields>'
  },
];
