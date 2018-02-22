import _ from 'lodash';
import Joi from 'joi';

const META_TYPES = {
  TAGS: 'tags',
};

export const metaSchema = Joi.array().items(Joi.string().valid(Object.values(META_TYPES))).single();

export class Meta {
  constructor(metaTypes, bulkGet) {
    this.metaTypes = Array.isArray(metaTypes) ? metaTypes : [metaTypes];
    this.bulkGet = bulkGet;
  }

  _extractBulkGetObjects(docs) {
    const bulkGetObjects = [];
    docs.forEach((doc) => {
      if (this.metaTypes.includes(META_TYPES.TAGS)) {
        _.get(doc, '_source.tags', []).forEach((tagId) => {
          bulkGetObjects.push({
            id: tagId,
            type: 'tag',
          });
        });
      }
    });
    return bulkGetObjects;
  }

  async prepareMetaMap(docs) {
    this.metaMap = new Map();

    const bulkGetResponce = await this.bulkGet(this._extractBulkGetObjects(docs));
    bulkGetResponce.saved_objects.forEach((savedObject) => {
      this.metaMap.set(
        savedObject.id,
        savedObject.error ? undefined : savedObject.attributes);
    });
  }

  getMeta(doc) {
    if (!this.metaMap) {
      throw new Error('prepareMetaMap must be called (and returned Promise resolved) before getMeta can be called.');
    }

    const meta = {};
    if (this.metaTypes.includes(META_TYPES.TAGS)) {
      meta.tags = {};
      _.get(doc, '_source.tags', []).forEach((tagId) => {
        meta.tags[tagId] = this.metaMap.get(tagId);
      });
    }
    return meta;
  }
}
