export default function (kibana) {

  return new kibana.Plugin({
    uiExports: {
      visTypes: ['plugins/tagcloud/tag_cloud_vis']
    }
  });
}
