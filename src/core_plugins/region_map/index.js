export default function (kibana) {

  return new kibana.Plugin({
    uiExports: {
      visTypes: ['plugins/region_map/region_map_vis']
    }
  });

}
