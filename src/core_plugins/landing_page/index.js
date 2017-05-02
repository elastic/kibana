export default function (kibana) {

  return new kibana.Plugin({
    uiExports: {
      managementSections: ['plugins/landing_page']
    }
  });
}
