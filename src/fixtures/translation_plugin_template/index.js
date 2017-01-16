import { resolve } from 'path';

export default function (kibana) {
  return new kibana.Plugin({
    id: 'kibana-es',

    uiExports: {
      translations: [
        resolve(__dirname, './translations/es.json')
      ]
    }
  });
}
