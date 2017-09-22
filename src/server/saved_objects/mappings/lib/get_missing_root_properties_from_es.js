import { difference } from 'lodash';

import { getTypes } from './get_types';
import { getRootProperties } from './get_root_properties';

export async function getMissingRootPropertiesFromEs({ callCluster, index, mappings }) {
  const resp = await callCluster('indices.get', {
    index,
    feature: '_mappings'
  });

  // could be different if aliases were resolved by `indices.get`
  const resolvedName = Object.keys(resp)[0];
  const currentDsl = resp[resolvedName].mappings;
  const currentTypes = getTypes(currentDsl);

  const isV5Index = currentTypes.length > 1 || currentTypes[0] !== mappings.getRootType();
  if (isV5Index) {
    throw new Error(
      'Your Kibana index is out of date, reset it or use the X-Pack upgrade assistant.'
    );
  }

  const expectedRootProps = mappings.getRootProperties();
  const missingPropNames = difference(
    Object.keys(expectedRootProps),
    Object.keys(getRootProperties(currentDsl))
  );

  return missingPropNames.reduce((acc, propName) => ({
    ...acc,
    [propName]: expectedRootProps[propName]
  }), []);
}
