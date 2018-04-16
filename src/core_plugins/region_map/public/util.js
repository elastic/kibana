import _ from 'lodash';

export function mapToLayerWithId(prefix, layer) {
  const clonedLayer = _.cloneDeep(layer);
  const idTracker = prefix === 'self_hosted' ? layer.name : JSON.stringify(layer.id);
  clonedLayer.layerId = prefix + '.' + idTracker;
  return clonedLayer;
}
