export default function (kibana) {

  return new kibana.Plugin({
    uiExports: {
      managementSections: ['plugins/getting_started']
    }
  });
}
