import { getRootProperties } from '../../../../server/mappings';
import { get } from 'lodash';
import { KibanaIndexPatch } from './kibana_index_patch';

const propertiesWithTitles = [
  'index-pattern',
  'dashboard',
  'visualization',
  'search',
];

export class PatchMissingTitleKeywordFields extends KibanaIndexPatch {
  getUpdatedPatchMappings() {
    const properties = getRootProperties(this.currentMappingsDsl);
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
  }

  async applyChanges(patchMappings) {
    const properties = Object.keys(patchMappings);
    const types = properties.map(type => ({ match: { type } }));

    this.log(['info', 'elasticsearch'], {
      tmpl: `Updating by query for Saved Object types "<%= names.join('", "') %>"`,
      names: properties,
    });

    await this.callCluster('updateByQuery', {
      conflicts: 'proceed',
      index: this.indexName,
      type: this.rootEsType,
      body: {
        query: {
          bool: {
            should: types,
          },
        },
      },
    });
  }
}
