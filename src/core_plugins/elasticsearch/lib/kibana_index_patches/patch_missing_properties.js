import { getRootProperties } from '../../../../server/mappings';
import { KibanaIndexPatch } from './kibana_index_patch';

export class PatchMissingProperties extends KibanaIndexPatch {
  getUpdatedPatchMappings() {
    const expectedProps = getRootProperties(this.kibanaIndexMappingsDsl);
    const existingProps = getRootProperties(this.currentMappingsDsl);

    return Object.keys(expectedProps)
      .reduce((acc, prop) => {
        if (existingProps[prop]) {
          return acc;
        } else {
          return { ...acc || {}, [prop]: expectedProps[prop] };
        }
      }, null);
  }
}
