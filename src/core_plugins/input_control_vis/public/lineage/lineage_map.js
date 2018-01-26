import _ from 'lodash';

export function getLineageMap(controlParamsList) {
  function getControlParamsById(controlId) {
    return controlParamsList.find((controlParams) => {
      return controlParams.id === controlId;
    });
  }

  const lineageMap = new Map();
  controlParamsList.forEach((rootControlParams) => {
    const lineage = [rootControlParams.id];
    const getLineage = (controlParams) => {
      if (_.has(controlParams, 'parent') && controlParams.parent !== '' && !lineage.includes(controlParams.parent)) {
        lineage.push(controlParams.parent);
        const parent = getControlParamsById(controlParams.parent);
        getLineage(parent);
      }
    };

    getLineage(rootControlParams);
    lineageMap.set(rootControlParams.id, lineage);
  });
  return lineageMap;
}
