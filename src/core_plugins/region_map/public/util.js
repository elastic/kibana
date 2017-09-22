import _ from 'lodash';

export function mapToLayerWithId(prefix, layer) {
  const clonedLayer = _.cloneDeep(layer);
  clonedLayer._id = prefix + '.' + layer.name;
  return clonedLayer;
}
