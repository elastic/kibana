export default function (kibana) {

  return new kibana.Plugin({
    uiExports: {
      visTypes: ['plugins/choropleth/choropleth_vis']
    }
  });

}
