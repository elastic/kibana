const vectorMaps = {
  'Countries': {
    url: '../plugins/choropleth/data/world_countries.geojson',
    fields: ['iso']
  },
  'States': {
    url: '../plugins/choropleth/data/state.geojson',
    fields: ['NAME']
  }
};

export default vectorMaps;
