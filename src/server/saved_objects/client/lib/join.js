import _ from 'lodash';
import Joi from 'joi';

const JOIN_TYPES = {
  TAGS: 'tags',
};

export const joinParameterSchema = Joi.array().items(Joi.string().valid(Object.values(JOIN_TYPES))).single();

export class Join {
  constructor(joinTypes, bulkGet) {
    this.joinTypes = Array.isArray(joinTypes) ? joinTypes : [joinTypes];
    this.bulkGet = bulkGet;
  }

  _extractBulkGetObjects(docs) {
    const bulkGetObjects = [];
    docs.forEach((doc) => {
      if (this.joinTypes.includes(JOIN_TYPES.TAGS)) {
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

  async prepareJoin(docs) {
    this.joinMap = new Map();

    const bulkGetResponce = await this.bulkGet(this._extractBulkGetObjects(docs));
    bulkGetResponce.saved_objects.forEach((savedObject) => {
      this.joinMap.set(
        savedObject.id,
        savedObject.error ? undefined : savedObject.attributes);
    });
  }

  getJoined(doc) {
    if (!this.joinMap) {
      throw new Error('prepareJoin must be called (and returned Promise resolved) before getJoined can be called.');
    }

    const join = {};
    if (this.joinTypes.includes(JOIN_TYPES.TAGS)) {
      join.tags = {};
      _.get(doc, '_source.tags', []).forEach((tagId) => {
        join.tags[tagId] = this.joinMap.get(tagId);
      });
    }
    return join;
  }
}
