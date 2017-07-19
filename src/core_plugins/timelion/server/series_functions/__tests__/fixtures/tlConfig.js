import moment from 'moment';
import sinon from 'sinon';
import timelionDefaults from '../../../lib/get_namespaced_settings';
import esResponse from './es_response';

export default function () {

  const functions = require('../../../lib/load_functions')('series_functions');
  const server = {
    plugins: {
      timelion: {
        getFunction: (name) => {
          if (!functions[name]) throw new Error ('No such function: ' + name);
          return functions[name];
        }
      },
      elasticsearch: {
        getCluster: sinon.stub().withArgs('data').returns({
          callWithRequest: function () {
            return Promise.resolve(esResponse);
          }
        })
      }
    }
  };

  const tlConfig = require('../../../handlers/lib/tl_config.js')({
    server: server,
    request: {}
  });

  tlConfig.time = {
    interval: '1y',
    from: moment('1980-01-01T00:00:00Z').valueOf(),
    to: moment('1983-01-01T00:00:00Z').valueOf(),
    timezone: 'Etc/UTC'
  };

  tlConfig.settings = timelionDefaults;

  tlConfig.setTargetSeries();

  return tlConfig;
}
