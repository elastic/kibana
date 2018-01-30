import { getRootProperties } from '../../../../server/mappings';

export const patchMissingProperties = {
  id: 'missing_properties',

  async getUpdatedPatchMappings(context) {
    const {
      kibanaIndexMappingsDsl,
      currentMappingsDsl
    } = context;

    const expectedProps = getRootProperties(kibanaIndexMappingsDsl);
    const existingProps = getRootProperties(currentMappingsDsl);

    return Object.keys(expectedProps)
      .reduce((acc, prop) => {
        if (existingProps[prop]) {
          return acc;
        } else {
          console.log('missing');
          return { ...acc || {}, [prop]: expectedProps[prop] };
        }
      }, null);
  }
};
