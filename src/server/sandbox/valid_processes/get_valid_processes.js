import { get } from 'lodash';
import { Observable } from 'rxjs';
import { findPluginSpecs } from '../../../plugin_discovery';

export async function getValidProcesses(settings) {
  const {
    pack$,
  } = findPluginSpecs(settings);

  return await pack$
    .mergeMap(pack => {
      const processes = get(pack._pkg, 'kibana.sandbox.processes');
      if (processes && processes.length) {
        return Observable.from(processes);
      }

      return Observable.empty();
    })
    .toArray()
    .toPromise();
}