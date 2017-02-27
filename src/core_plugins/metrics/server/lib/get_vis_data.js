import _ from 'lodash';
import getPanelData from './vis_data/get_panel_data';

function getVisData(req) {
  const reqs = req.payload.panels.map(getPanelData(req));
  return Promise.all(reqs)
    .then(res => {
      return res.reduce((acc, data) => {
        return _.assign(acc, data);
      }, {});
    });
}

export default getVisData;

