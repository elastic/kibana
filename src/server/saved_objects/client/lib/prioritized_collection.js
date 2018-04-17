/**
 * A simple collection of entities that can be prioritized.
 */
export class PrioritizedCollection {
  constructor(name) {
    this._name = name;
    this._entities = {};
  }

  /**
   * Add an entity to this collection.
   *
   * @param {*} entity the entity to store
   * @param {number} priority optionally specify a priority. Omit to use the next available priority.
   */
  add(entity, priority = this._getNextPriority()) {
    if (this._entities.hasOwnProperty(priority)) {
      throw new Error(`${this._name} already has an entry with priority ${priority}. Please choose a different priority.`);
    }
    if (typeof priority !== 'number') {
      throw new Error(`Priority for ${this._name} must be a number.`);
    }

    this._entities[priority] = entity;
  }

  /**
   * Returns an array of all entities, in priority order.
   */
  toArray() {
    return Object
      .keys(this._entities)
      .sort((priority1, priority2) => priority1 - priority2)
      .map(key => this._entities[key]);
  }

  _getNextPriority() {
    return Math.max(0, ...Object.keys(this._entities)) + 1;
  }
}
