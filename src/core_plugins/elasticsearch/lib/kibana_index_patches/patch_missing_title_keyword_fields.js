import { getRootProperties } from '../../../../server/mappings';
import { get } from 'lodash';

const propertiesWithTitles = [
  'index-pattern',
  'dashboard',
  'visualization',
  'search',
];

export const patchMissingTitleKeywordFields = {
  id: 'missing_title_keyword_fields',

  async getUpdatedPatchMappings(context) {
    const {
      currentMappingsDsl
    } = context;

    const properties = getRootProperties(currentMappingsDsl);
    const mappings = {};

    for (const property of propertiesWithTitles) {
      const hasKeyword = !!get(properties, `${property}.properties.title.fields.keyword`);
      if (hasKeyword) {
        continue;
      }

      const titleMapping = get(properties, `${property}.properties.title`);
      mappings[property] = {
        properties: {
          title: {
            ...titleMapping,
            fields: {
              keyword: {
                type: 'keyword',
              }
            }
          }
        }
      };
    }

    // Make sure we return a falsy value
    if (!Object.keys(mappings).length) {
      return;
    }

    return mappings;
  },

  async applyChanges(context) {
    const {
      patchMappings,
      callCluster,
      indexName,
      rootEsType,
      log,
    } = context;

    const properties = Object.keys(patchMappings);
    const types = properties.map(type => ({ match: { type } }));

    log(['info', 'elasticsearch'], {
      tmpl: `Updating by query for Saved Object types "<%= names.join('", "') %>"`,
      names: properties,
    });

    await callCluster('updateByQuery', {
      conflicts: 'proceed',
      index: indexName,
      type: rootEsType,
      body: {
        query: {
          bool: {
            should: types,
          },
        },
      },
    });
  }
};
