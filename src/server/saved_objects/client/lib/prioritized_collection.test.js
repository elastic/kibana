import { PrioritizedCollection } from './prioritized_collection';

describe('PrioritizedCollection', () => {
  it('should add a single entry with a default priority', () => {
    const collection = new PrioritizedCollection('unit test');
    const entity = {};
    collection.add(entity);

    const result = collection.toArray();
    expect(result).to.equal([entity]);
  });

  it('should prioritize entities in the order in which they are added', () => {
    const collection = new PrioritizedCollection('unit test');
    const entity1 = {};
    const entity2 = {};

    collection.add(entity1);
    collection.add(entity2);

    const result = collection.toArray();
    expect(result).to.equal([entity1, entity2]);
  });

  it('should honor the provided priority', () => {
    const collection = new PrioritizedCollection('unit test');
    const entity1 = {};
    const entity2 = {};

    collection.add(entity1, 10);
    collection.add(entity2, 1);

    const result = collection.toArray();
    expect(result).to.equal([entity2, entity1]);
  });

  it('should throw an error when a duplicate priority is specified', () => {
    const collection = new PrioritizedCollection('unit test');
    const entity1 = {};
    const entity2 = {};

    collection.add(entity1, 10);

    expect(() => {
      collection.add(entity2, 10);
    }).to.throwError(`unit test already has an entry with priority 10. Please choose a different priority.`);
  });

  it('should throw an error when an invalid priority is specified', () => {
    const collection = new PrioritizedCollection('unit test');
    const entity1 = {};

    expect(() => {
      collection.add(entity1, 'not a number');
    }).to.throwError(`Priority for unit test must be a number.`);
  });
});
