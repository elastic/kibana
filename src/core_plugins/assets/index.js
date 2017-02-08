import path from 'path';

console.log(__dirname);

//you'll need something like
//https://localhost:5601/kzf/plugins/assets/state.geojson
//https://localhost:5601/kzf/plugins/choropleth/data/state.geojson
module.exports = function (kibana) {
  return new kibana.Plugin({
    id: 'assets',
    publicDir: path.resolve(__dirname, 'public')
  });
};
