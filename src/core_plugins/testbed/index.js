import { resolve } from 'path';

export default function (kibana) {
  return new kibana.Plugin({
    publicDir: resolve(__dirname, 'public'),
    uiExports: {
      hacks: [ 'plugins/testbed' ]
    }
  });
}
