import expect from 'expect.js';
import sinon from 'sinon';
import createMultiSelectModel from '../create_multi_select_model';

describe('createMultiSelectModel', function () {

  it('should throw an error if the first argument is not an array', () => {
    expect(createMultiSelectModel).withArgs('foo', []).to.throwError();
    expect(createMultiSelectModel).withArgs(1234, []).to.throwError();
    expect(createMultiSelectModel).withArgs(undefined, []).to.throwError();
    expect(createMultiSelectModel).withArgs(null, []).to.throwError();
    expect(createMultiSelectModel).withArgs([], []).to.not.throwError();
  });

  it('should throw an error if the second argument is not an array', () => {
    expect(createMultiSelectModel).withArgs([], 'foo').to.throwError();
    expect(createMultiSelectModel).withArgs([], 1234).to.throwError();
    expect(createMultiSelectModel).withArgs([], undefined).to.throwError();
    expect(createMultiSelectModel).withArgs([], null).to.throwError();
    expect(createMultiSelectModel).withArgs([], []).to.not.throwError();
  });

  it('should output an array with an item for each passed in', () => {
    const items = [ 'foo', 'bar', 'baz' ];
    const expected = [
      { title: 'foo', selected: false },
      { title: 'bar', selected: false },
      { title: 'baz', selected: false }
    ];
    const actual = createMultiSelectModel(items, []);

    expect(actual).to.eql(expected);
  });

  it('should set the selected property in the output', () => {
    const items = [ 'foo', 'bar', 'baz' ];
    const selectedItems = [ 'bar', 'baz' ];
    const expected = [
      { title: 'foo', selected: false },
      { title: 'bar', selected: true },
      { title: 'baz', selected: true }
    ];
    const actual = createMultiSelectModel(items, selectedItems);

    expect(actual).to.eql(expected);
  });

  it('should trim values when comparing for selected', () => {
    const items = [ 'foo', 'bar', 'baz' ];
    const selectedItems = [ ' bar ', ' baz ' ];
    const expected = [
      { title: 'foo', selected: false },
      { title: 'bar', selected: true },
      { title: 'baz', selected: true }
    ];
    const actual = createMultiSelectModel(items, selectedItems);

    expect(actual).to.eql(expected);
  });

  it('should be case insensitive when comparing for selected', () => {
    const items = [ 'foo', 'bar', 'baz' ];
    const selectedItems = [ ' Bar ', ' BAZ ' ];
    const expected = [
      { title: 'foo', selected: false },
      { title: 'bar', selected: true },
      { title: 'baz', selected: true }
    ];
    const actual = createMultiSelectModel(items, selectedItems);

    expect(actual).to.eql(expected);
  });

});
