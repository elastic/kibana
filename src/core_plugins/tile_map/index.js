export default function (kibana) {

  return new kibana.Plugin({
    uiExports: {
      visTypes: ['plugins/tile_map/tile_map_vis']
    }
  });
}
