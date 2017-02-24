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

export default vectorMaps;
