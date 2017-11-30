import { getRootProperties } from '../../../../server/mappings';
import { KibanaIndexChange } from './kibana_index_change';

export class ChangeMistypedTypeField extends KibanaIndexChange {
  getNewMappings() {
    const properties = getRootProperties(this.currentMappingsDsl);
    const typeProperty = properties.type;
    if (typeProperty.type !== 'keyword') {
      properties.type.type = 'keyword';
      return properties;
    }
  }
}
