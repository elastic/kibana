import { getTitle } from '../editor_utils';

export function getParentCandidates(controlParamsList, controlId, lineageMap) {
  return controlParamsList.filter((controlParams) => {
    // Ignore controls that do not have index pattern and field set
    if (!controlParams.indexPattern || !controlParams.fieldName) {
      return false;
    }
    // Ignore controls that would create a circlar graph
    const lineage = lineageMap.get(controlParams.id);
    if (lineage.includes(controlId)) {
      return false;
    }
    return true;
  }).map((controlParams, controlIndex) => {
    return {
      value: controlParams.id,
      text: getTitle(controlParams, controlIndex)
    };
  });
}
