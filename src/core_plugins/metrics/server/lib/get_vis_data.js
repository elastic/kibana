import getPanelData from './vis_data/get_panel_data';

function getVisData(req) {
  const promises = req.payload.panels.map(getPanelData(req));
  return Promise.all(promises)
    .then(res => {
      return res.reduce((acc, data) => {
        return Object.assign(acc, data);
      }, {});
    });
}

export default getVisData;

