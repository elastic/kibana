const vectorMaps = {
  'Countries': {
    url: '../plugins/choropleth/data/world_countries.geojson',
    fields: ['iso']
  },
  'States': {
    url: '../plugins/choropleth/data/us_states.geojson',
    fields: ['NAME']
  }
};

// const vectorMaps = {
//   'Countries': ['iso'],
//   'States': ['name', 'abbr']
// };
//
// const vectorMaps = [{
//   name: 'Countries',
//   url: '../plugins/choropleth/data/world_countries.geojson',
//   fields: ['iso']
// },
//   {
//   name: 'States',
//     url: '../plugins/choropleth/data/us_states.geojson',
//     fields: ['name', 'abbr']
//   }];


export default vectorMaps;
